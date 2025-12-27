import type { Request, Response } from "express";
import { TeamService } from "./team.service.ts";

export class TeamController {
  static async create(req: Request, res: Response) {
    const team = await TeamService.create(req.body, req.user!);
    res.status(201).json(team);
  }

  static async list(_req: Request, res: Response) {
    const teams = await TeamService.list();
    res.json(teams);
  }

  static async addMember(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const member = await TeamService.addMember({ ...req.body, teamId: id }, req.user!);
    res.status(201).json(member);
  }

  static async listMembers(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const members = await TeamService.members(id);
    res.json(members);
  }
}
