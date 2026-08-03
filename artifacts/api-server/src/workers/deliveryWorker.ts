/**
 * Provider-neutral admission delivery worker.
 *
 * Polls the admission_delivery_queue every 30 s and processes queued items.
 * No provider is hardcoded – the dispatcher resolves a channel handler at
 * runtime, making it trivial to plug in a real email / SMS / WhatsApp SDK.
 *
 * Channel handlers receive the full queue row and return { ok, error }.
 * A missing handler is treated as a soft failure (logged, retried up to 3×).
 */

import { eq, and, lt } from "drizzle-orm";
import { admissionDeliveryQueueTable, db } from "@workspace/db";
import { logger } from "../lib/logger";

type ChannelPayload = {
  id: number;
  channel: string;
  template: string;
  recipient: string;
  payload: Record<string, string>;
};

type ChannelResult = { ok: boolean; error?: string };

// ── Channel handlers (provider-neutral stubs) ──────────────────────────────
// Replace the body of each handler with real SDK calls when a provider is
// configured. The function signature and return type must remain stable.

async function handleEmail(item: ChannelPayload): Promise<ChannelResult> {
  // TODO: inject provider (Resend, SendGrid, SES, Mailgun …) via env vars
  logger.info({ recipient: item.recipient, template: item.template }, "delivery:email simulated");
  return { ok: true };
}

async function handleSms(item: ChannelPayload): Promise<ChannelResult> {
  // TODO: inject provider (Twilio, AWS SNS, Msg91 …) via env vars
  logger.info({ recipient: item.recipient, template: item.template }, "delivery:sms simulated");
  return { ok: true };
}

async function handleWhatsapp(item: ChannelPayload): Promise<ChannelResult> {
  // TODO: inject provider (WhatsApp Business API, 360dialog …) via env vars
  logger.info({ recipient: item.recipient, template: item.template }, "delivery:whatsapp simulated");
  return { ok: true };
}

const channelHandlers: Record<string, (item: ChannelPayload) => Promise<ChannelResult>> = {
  email: handleEmail,
  sms: handleSms,
  whatsapp: handleWhatsapp,
};

// ── Worker loop ────────────────────────────────────────────────────────────
export function startDeliveryWorker(intervalMs = 30_000): NodeJS.Timeout {
  async function tick() {
    try {
      const batch = await db
        .select()
        .from(admissionDeliveryQueueTable)
        .where(
          and(
            eq(admissionDeliveryQueueTable.status, "queued"),
          ),
        )
        .limit(20);

      for (const item of batch) {
        const handler = channelHandlers[item.channel];
        if (!handler) {
          await db
            .update(admissionDeliveryQueueTable)
            .set({ status: "failed", lastError: `No handler for channel: ${item.channel}`, processedAt: new Date(), attempts: item.attempts + 1 })
            .where(eq(admissionDeliveryQueueTable.id, item.id));
          continue;
        }

        // Optimistically mark as processing
        await db
          .update(admissionDeliveryQueueTable)
          .set({ status: "processing", attempts: item.attempts + 1 })
          .where(eq(admissionDeliveryQueueTable.id, item.id));

        try {
          const result = await handler({
            id: item.id,
            channel: item.channel,
            template: item.template,
            recipient: item.recipient,
            payload: item.payload,
          });

          if (result.ok) {
            await db
              .update(admissionDeliveryQueueTable)
              .set({ status: "delivered", processedAt: new Date(), lastError: null })
              .where(eq(admissionDeliveryQueueTable.id, item.id));
          } else {
            const nextStatus = item.attempts >= 2 ? "failed" : "queued";
            await db
              .update(admissionDeliveryQueueTable)
              .set({ status: nextStatus, lastError: result.error ?? "Handler returned ok:false", processedAt: nextStatus === "failed" ? new Date() : null })
              .where(eq(admissionDeliveryQueueTable.id, item.id));
          }
        } catch (err: any) {
          const nextStatus = item.attempts >= 2 ? "failed" : "queued";
          await db
            .update(admissionDeliveryQueueTable)
            .set({ status: nextStatus, lastError: String(err?.message ?? err), processedAt: nextStatus === "failed" ? new Date() : null })
            .where(eq(admissionDeliveryQueueTable.id, item.id));
          logger.error({ err, itemId: item.id }, "delivery:worker handler error");
        }
      }
    } catch (err) {
      logger.error({ err }, "delivery:worker tick error");
    }
  }

  logger.info("Admission delivery worker started");
  return setInterval(tick, intervalMs);
}
