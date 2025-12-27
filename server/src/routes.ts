import { Router } from "express";
import equipmentRoutes from "./modules/equipment/equipment.routes.ts";
import maintenanceRequestRoutes from "./modules/maintenance-request/maintenance-request.routes.ts";
import teamRoutes from "./modules/team/team.routes.ts";

const router: Router = Router();

router.use("/equipment", equipmentRoutes);
router.use("/requests", maintenanceRequestRoutes);
router.use("/teams", teamRoutes);

export default router;
