import { Router } from "express";
import { z } from "zod";
import { RequestState, RequestType, TeamRole } from "../../common/enums.ts";
import { asyncHandler, requireAuth, validate } from "../../common/middleware.ts";
import { MaintenanceRequestController } from "./maintenance-request.controller.ts";

const router: Router = Router();

const createSchema = z.object({
	subject: z.string().min(1),
	description: z.string().max(2000).optional(),
	type: z.nativeEnum(RequestType),
	equipmentId: z.string().uuid(),
	technicianId: z.string().uuid().optional(),
	scheduledDate: z.coerce.date().optional(),
	dueDate: z.coerce.date().optional()
});

const listSchema = z.object({
	state: z.nativeEnum(RequestState).optional(),
	teamId: z.string().uuid().optional(),
	equipmentId: z.string().uuid().optional()
});

const idSchema = z.object({ id: z.string().uuid() });

const assignSchema = z.object({ technicianId: z.string().uuid() });

const moveStateSchema = z.object({ state: z.nativeEnum(RequestState) });

router.post(
	"/",
	requireAuth([TeamRole.Manager, TeamRole.Technician]),
	validate(createSchema),
	asyncHandler(MaintenanceRequestController.create)
);

router.get(
	"/",
	requireAuth(),
	validate(listSchema, "query"),
	asyncHandler(MaintenanceRequestController.list)
);

router.get("/kanban", requireAuth(), asyncHandler(MaintenanceRequestController.kanban));

router.get(
	"/:id",
	requireAuth(),
	validate(idSchema, "params"),
	asyncHandler(MaintenanceRequestController.getById)
);

router.patch(
	"/:id/assign",
	requireAuth([TeamRole.Manager, TeamRole.Technician]),
	validate(idSchema, "params"),
	validate(assignSchema),
	asyncHandler(MaintenanceRequestController.assignTechnician)
);

router.patch(
	"/:id/state",
	requireAuth([TeamRole.Manager, TeamRole.Technician]),
	validate(idSchema, "params"),
	validate(moveStateSchema),
	asyncHandler(MaintenanceRequestController.moveState)
);

export default router;
