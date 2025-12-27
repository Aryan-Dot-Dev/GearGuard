import type { Request, Response } from "express";
import { EquipmentService } from "./equipement.service.ts";

export class EquipmentController {
	static async create(req: Request, res: Response) {
		const equipment = await EquipmentService.create(req.body, req.user!);
		res.status(201).json(equipment);
	}

	static async list(_req: Request, res: Response) {
		const equipment = await EquipmentService.list();
		res.json(equipment);
	}

	static async getById(req: Request, res: Response) {
		const { id } = req.params as { id: string };
		const equipment = await EquipmentService.getById(id);
		res.json(equipment);
	}

	static async update(req: Request, res: Response) {
		const { id } = req.params as { id: string };
		const equipment = await EquipmentService.update(id, req.body, req.user!);
		res.json(equipment);
	}
}
