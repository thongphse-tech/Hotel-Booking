import { roomService } from "../services/roomService.js";
import { apiClient } from "../services/apiClient.js";

export const roomController = {
  list: (filters) => roomService.getRooms(filters),
  search: (filters) => roomService.searchRooms(filters),
  details: (id) => roomService.getRoom(id),
  create: (data) => apiClient.request("/rooms", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiClient.request(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiClient.request(`/rooms/${id}`, { method: "DELETE" }),
  updateStatus: (id, status) => apiClient.request(`/rooms/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  createType: (data) => apiClient.request("/rooms/types", { method: "POST", body: JSON.stringify(data) }),
  updateType: (id, data) => apiClient.request(`/rooms/types/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteType: (id) => apiClient.request(`/rooms/types/${id}`, { method: "DELETE" })
};
