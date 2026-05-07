import { ZodError } from "zod";
import AppError from "../utils/appError.js";

export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }

      if (params) {
        req.params = params.parse(req.params);
      }

      if (query) {
        req.query = query.parse(req.query);
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(
            "Dados de entrada invalidos",
            400,
            error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            }))
          )
        );
      }

      return next(error);
    }
  };
}
