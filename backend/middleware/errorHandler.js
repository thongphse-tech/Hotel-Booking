export function errorHandler(err, req, res, next) {
  const status = err.status || (err.code === "23505" ? 409 : err.code === "23503" ? 409 : err.code === "22P02" ? 400 : 500);
  if (status === 500) process.stderr.write(`${err.stack || err.message}\n`);
  const message = status === 500 ? "Internal server error." : err.status ? err.message : status === 409 ? "The requested record conflicts with existing data." : "Invalid request data.";
  res.status(status).json({ message });
}

export function notFound(req, res) {
  res.status(404).json({ message: "Route not found." });
}
