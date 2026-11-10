import { roomService } from "../service/roomService.js";
import { HttpError } from "../service/httpError.js";

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
  uploadTypeImage: async (req, res) => {
    if (!req.file) throw new HttpError(400, "Choose a JPG, PNG, WebP, or GIF image up to 5MB.");
    res.json(await roomService.setTypeImage(req.params.id, `/uploads/room-types/${req.file.filename}`));
  },
  deleteType: async (req, res) => res.json(await roomService.deleteType(req.params.id))
};
