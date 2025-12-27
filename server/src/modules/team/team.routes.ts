import { Router } from "express";
import { z } from "zod";
import { TeamRole } from "../../common/enums.ts";
import { asyncHandler, requireAuth, validate } from "../../common/middleware.ts";
import { TeamController } from "./team.controller.ts";

const router: Router = Router();

const createSchema = z.object({
	name: z.string().min(1)
});

const memberSchema = z.object({
	userId: z.string().min(1),
	name: z.string().min(1),
	email: z.string().email().optional()
});

const idSchema = z.object({ id: z.string().uuid() });

router.post(
	"/",
	requireAuth([TeamRole.Manager]),
	validate(createSchema),
	asyncHandler(TeamController.create)
);

router.get("/", requireAuth(), asyncHandler(TeamController.list));

router.post(
	"/:id/members",
	requireAuth([TeamRole.Manager]),
	validate(idSchema, "params"),
	validate(memberSchema),
	asyncHandler(TeamController.addMember)
);

router.get(
	"/:id/members",
	requireAuth(),
	validate(idSchema, "params"),
	asyncHandler(TeamController.listMembers)
);

export default router;
