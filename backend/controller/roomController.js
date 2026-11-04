import { roomService } from "../service/roomService.js";

export const roomController = {
  list: async (req, res) => res.json(await roomService.list(req.query)),
  listManagement: async (req, res) => res.json(await roomService.listManagement()),
  get: async (req, res) => res.json(await roomService.get(req.params.id)),
  search: async (req, res) => res.json(await roomService.search(req.query)),
  create: async (req, res) => res.status(201).json(await roomService.create(req.body)),
  update: async (req, res) => res.json(await roomService.update(req.params.id, req.body)),
  updateStatus: async (req, res) => res.json(await roomService.updateStatus(req.params.id, req.body.status)),
  delete: async (req, res) => res.json(await roomService.delete(req.params.id)),
  listTypes: async (req, res) => res.json(await roomService.listTypes()),
  createType: async (req, res) => res.status(201).json(await roomService.createType(req.body)),
  updateType: async (req, res) => res.json(await roomService.updateType(req.params.id, req.body)),
  deleteType: async (req, res) => res.json(await roomService.deleteType(req.params.id))
};
