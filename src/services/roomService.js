import { apiClient } from "./apiClient.js";

const roomImage = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=90";
const roomPreviewImage = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=720&q=80";
const mapRoom = (item) => ({
  id: item.roomid,
  roomTypeId: item.roomtypeid,
  roomNumber: item.roomnumber,
  floor: Number(item.floor ?? 1),
  name: `${item.type} ${item.roomnumber}`,
  type: item.type,
  price: Number(item.price),
  capacity: Number(item.capacity),
  beds: item.bedtypes || item.bed_types || "Bed configuration not specified",
  image: roomImage,
  imagePreview: roomPreviewImage,
  amenities: String(item.amenities || "").split(",").map((value) => value.trim()).filter(Boolean),
  description: item.description || "A comfortable room for your stay.",
  status: item.status
});

export const roomService = {
  getRooms: async (filters = {}) => {
    const user = apiClient.user();
    const isStaff = ["admin", "staff"].includes(String(user?.role || "").toLowerCase());
    const params = new URLSearchParams();
    if (filters.minimumCapacity) params.set("minimumCapacity", filters.minimumCapacity);
    if (filters.sort) params.set("sort", filters.sort);
    const query = params.toString();
    const endpoint = isStaff ? "/rooms/management" : `/rooms${query ? `?${query}` : ""}`;
    return (await apiClient.request(endpoint)).map(mapRoom);
  },
  getRoom: async (id) => mapRoom(await apiClient.request(`/rooms/${id}`)),
  searchRooms: async (filters) => {
    if (filters.checkIn && filters.checkOut && filters.checkOut <= filters.checkIn) throw new Error("Check-out date must be after check-in date.");
    const params = new URLSearchParams();
    for (const key of ["checkIn", "checkOut", "guests", "type"]) if (filters[key] && filters[key] !== "All") params.set(key, filters[key]);
    return (await apiClient.request(`/rooms/search?${params}`)).map(mapRoom);
  }
};
