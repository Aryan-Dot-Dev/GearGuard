import type { Request, Response } from "express";
import { RequestState } from "../../common/enums.ts";
import { MaintenanceRequestService } from "./maintenance-request.service.ts";

export class MaintenanceRequestController {
  static async create(req: Request, res: Response) {
    const request = await MaintenanceRequestService.create(req.body, req.user!);
    res.status(201).json(request);
  }

  static async list(req: Request, res: Response) {
    const { state, teamId, equipmentId } = req.query as Record<string, string | undefined>;
    const filters: Record<string, unknown> = {};
    if (state) filters.state = state as RequestState;
    if (teamId) filters.teamId = teamId;
    if (equipmentId) filters.equipmentId = equipmentId;

    const requests = await MaintenanceRequestService.list(filters as any, req.user!);
    res.json(requests);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const request = await MaintenanceRequestService.getById(id, req.user!);
    res.json(request);
  }

  static async kanban(req: Request, res: Response) {
    const buckets = await MaintenanceRequestService.kanbanView(req.user!);
    res.json(buckets);
  }

  static async assignTechnician(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const request = await MaintenanceRequestService.assignTechnician(
      id,
      req.body.technicianId,
      req.user!
    );
    res.json(request);
  }

  static async moveState(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const request = await MaintenanceRequestService.moveState(
      id,
      req.body.state as RequestState,
      req.user!
    );
    res.json(request);
  }
}
