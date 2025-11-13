const safeParseJson = (value) => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

exports.handler = async (event) => {
  const route = event?.requestContext?.http?.path ?? "unknown";
  const method = event?.requestContext?.http?.method ?? "UNKNOWN";

  const response = {
    message: "Habify API placeholder",
    route,
    method,
    input: safeParseJson(event?.body),
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  };
};
