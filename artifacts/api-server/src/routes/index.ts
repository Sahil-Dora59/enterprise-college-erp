import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import departmentsRouter from "./departments";
import semestersRouter from "./semesters";
import coursesRouter from "./courses";
import studentsRouter from "./students";
import facultyRouter from "./faculty";
import attendanceRouter from "./attendance";
import examinationsRouter from "./examinations";
import marksRouter from "./marks";
import assignmentsRouter from "./assignments";
import libraryRouter from "./library";
import feesRouter from "./fees";
import noticesRouter from "./notices";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(departmentsRouter);
router.use(semestersRouter);
router.use(coursesRouter);
router.use(studentsRouter);
router.use(facultyRouter);
router.use(attendanceRouter);
router.use(examinationsRouter);
router.use(marksRouter);
router.use(assignmentsRouter);
router.use(libraryRouter);
router.use(feesRouter);
router.use(noticesRouter);
router.use(dashboardRouter);

export default router;
