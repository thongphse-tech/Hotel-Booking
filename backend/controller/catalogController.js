import { catalogService } from "../service/catalogService.js";

export const catalogController = {
  listDiscounts: async (req, res) => res.json(await catalogService.listDiscounts()),
  availableDiscounts: async (req, res) => res.json(await catalogService.availableDiscounts(req.query.roomTypeId)),
  validateDiscount: async (req, res) => res.json(await catalogService.validateDiscount(req.query.code, req.query.roomTypeId)),
  createDiscount: async (req, res) => res.status(201).json(await catalogService.createDiscount(req.body)),
  updateDiscount: async (req, res) => res.json(await catalogService.updateDiscount(req.params.id, req.body)),
  setDiscountActive: async (req, res) => res.json(await catalogService.setDiscountActive(req.params.id, req.body.isActive)),
  listServices: async (req, res) => res.json(await catalogService.listServices(req.query)),
  createService: async (req, res) => res.status(201).json(await catalogService.createService(req.body)),
  updateService: async (req, res) => res.json(await catalogService.updateService(req.params.id, req.body)),
  deleteService: async (req, res) => res.json(await catalogService.deleteService(req.params.id)),
  listServiceBookings: async (req, res) => res.json(await catalogService.listServiceBookings(req.user)),
  bookService: async (req, res) => res.status(201).json(await catalogService.bookService(req.user, req.body)),
  listReviews: async (req, res) => res.json(await catalogService.listReviews({ ...req.query, user: req.user })),
  eligibleReviewBookings: async (req, res) => res.json(await catalogService.eligibleReviewBookings(req.user)),
  submitReview: async (req, res) => res.status(201).json(await catalogService.submitReview(req.user, req.body)),
  approveReview: async (req, res) => res.json(await catalogService.approveReview(req.params.id, req.body.isApproved)),
  listCustomers: async (req, res) => res.json(await catalogService.listCustomers()),
  getCustomer: async (req, res) => res.json(await catalogService.getCustomer(req.params.id)),
  updateCustomer: async (req, res) => res.json(await catalogService.updateCustomer(req.params.id, req.body)),
  setCustomerActive: async (req, res) => res.json(await catalogService.setCustomerActive(req.params.id, req.body.isActive))
};
