import { Router } from "express";
import { z } from "zod";
import { EquipmentStatus, TeamRole } from "../../common/enums.ts";
import { asyncHandler, requireAuth, validate } from "../../common/middleware.ts";
import { EquipmentController } from "./equipment.controller.ts";

const router: Router = Router();

const createSchema = z.object({
	name: z.string().min(1),
	serialNumber: z.string().min(1),
	owner: z.string().min(1),
	location: z.string().min(1),
	maintenanceTeamId: z.string().uuid(),
	defaultTechnicianId: z.string().uuid()
});

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	serialNumber: z.string().min(1).optional(),
	owner: z.string().min(1).optional(),
	location: z.string().min(1).optional(),
	maintenanceTeamId: z.string().uuid().optional(),
	defaultTechnicianId: z.string().uuid().optional(),
	status: z.nativeEnum(EquipmentStatus).optional()
});

const idSchema = z.object({ id: z.string().uuid() });

router.post(
	"/",
	requireAuth([TeamRole.Manager]),
	validate(createSchema),
	asyncHandler(EquipmentController.create)
);

router.get("/", requireAuth(), asyncHandler(EquipmentController.list));

router.get(
	"/:id",
	requireAuth(),
	validate(idSchema, "params"),
	asyncHandler(EquipmentController.getById)
);

router.patch(
	"/:id",
	requireAuth([TeamRole.Manager]),
	validate(idSchema, "params"),
	validate(updateSchema),
	asyncHandler(EquipmentController.update)
);

export default router;
