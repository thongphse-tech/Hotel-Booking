import { bookingService } from "../service/bookingService.js";

export const bookingController = {
  list: async (req, res) =>
    res.json(await bookingService.list(req.user, req.query)),
  get: async (req, res) =>
    res.json(await bookingService.get(req.params.id, req.user)),
  create: async (req, res) =>
    res.status(201).json(await bookingService.create(req.user, req.body)),
  update: async (req, res) =>
    res.json(await bookingService.update(req.params.id, req.body)),
  confirm: async (req, res) =>
    res.json(await bookingService.confirm(req.params.id)),
  cancel: async (req, res) =>
    res.json(await bookingService.cancel(req.params.id, req.user)),
  checkIn: async (req, res) =>
    res.json(await bookingService.checkIn(req.params.id)),
  checkOut: async (req, res) =>
    res.json(await bookingService.checkOut(req.params.id)),
  staffCheckIn: async (req, res) =>
    res.json(await bookingService.checkIn(req.body?.bookingId)),
  staffCheckOut: async (req, res) =>
    res.json(await bookingService.checkOut(req.body?.bookingId)),
  stayInvoice: async (req, res) =>
    res.json(await bookingService.stayInvoice(req.params.id)),
  collectStayPayment: async (req, res) =>
    res
      .status(201)
      .json(
        await bookingService.collectStayPayment(
          req.params.id,
          req.body?.method,
        ),
      ),
  listRefundRequests: async (req, res) =>
    res.json(await bookingService.listRefundRequests(req.user)),
  completeRefund: async (req, res) =>
    res.json(await bookingService.completeRefund(req.params.id, req.user)),
  createPayment: async (req, res) => {
    const method = req.body?.method || "mock";
    res
      .status(201)
      .json(
        await bookingService.createPayment(req.params.id, req.user, method),
      );
  },
  paymentHistory: async (req, res) =>
    res.json(await bookingService.paymentHistory(req.user, req.query)),
  simulatePayment: async (req, res) =>
    res
      .status(200)
      .json(
        await bookingService.simulatePayment(
          req.body?.bookingId,
          req.user,
          req.body?.outcome,
        ),
      ),
  confirmPayment: async (req, res) =>
    res.json(await bookingService.confirmPayment(req.body)),
  vnpayCallback: async (req, res) => {
    const {
      vnp_SecureHash,
      vnp_TxnRef,
      vnp_Amount,
      vnp_ResponseCode,
      vnp_TransactionStatus,
    } = req.query;
    const tmnCode = process.env.VNP_TMN_CODE;
    const hashSecret = process.env.VNP_HASH_SECRET;

    const result = await bookingService.verifyVnpayCallback(
      vnp_SecureHash,
      tmnCode,
      hashSecret,
      req.query,
    );

    if (result.success) {
      res.redirect(
        `${process.env.CLIENT_ORIGIN}/bookings?payment=success&bookingId=${result.txnRef.replace("BK", "")}`,
      );
    } else {
      res.redirect(`${process.env.CLIENT_ORIGIN}/bookings?payment=failed`);
    }
  },
};
