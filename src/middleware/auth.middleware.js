import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";

export function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(new AppError("Token ausente", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    return next();
  } catch (error) {
    return next(error);
  }
}