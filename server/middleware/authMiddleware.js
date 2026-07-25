const jwt = require("jsonwebtoken");

function protect(request, response, next) {
  const authorizationHeader = request.headers.authorization;

  if (
    !authorizationHeader ||
    !authorizationHeader.startsWith("Bearer ")
  ) {
    return response.status(401).json({
      message: "You must be logged in."
    });
  }

  const token = authorizationHeader.split(" ")[1];

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    request.userId = decodedToken.userId;

    next();
  } catch (error) {
    return response.status(401).json({
      message: "Your login has expired. Please log in again."
    });
  }
}

module.exports = protect;