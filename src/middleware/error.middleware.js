import AppError from "../utils/appError.js";

function buildResponse(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.message,
        details: error.details || undefined,
      },
    };
  }

  if (error?.name === "CastError") {
    return {
      statusCode: 400,
      payload: { error: `Campo invalido: ${error.path}` },
    };
  }

  if (error?.name === "ValidationError") {
    return {
      statusCode: 400,
      payload: {
        error: "Erro de validacao",
        details: Object.values(error.errors || {}).map((item) => ({
          path: item.path,
          message: item.message,
        })),
      },
    };
  }

  if (error?.code === 11000) {
    return {
      statusCode: 409,
      payload: {
        error: "Registro duplicado",
        details: Object.keys(error.keyValue || {}).map((key) => ({
          path: key,
          message: "valor ja em uso",
        })),
      },
    };
  }

  if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
    return {
      statusCode: 401,
      payload: { error: "Token invalido ou expirado" },
    };
  }

  return {
    statusCode: 500,
    payload: { error: "Erro interno do servidor" },
  };
}

export function notFoundHandler(req, res, next) {
  next(new AppError(`Rota nao encontrada: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error, req, res, next) {
  const { statusCode, payload } = buildResponse(error);

  if (statusCode >= 500) {
    console.error("[errorHandler]", error);
  }

  res.status(statusCode).json(payload);
}