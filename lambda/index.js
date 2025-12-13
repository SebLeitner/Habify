const crypto = require('node:crypto');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const ACTIVITIES_TABLE = process.env.ACTIVITIES_TABLE;
const LOGS_TABLE = process.env.LOGS_TABLE;
const HIGHLIGHTS_TABLE = process.env.HIGHLIGHTS_TABLE;

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const safeParseJson = (value) => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return undefined;
  }
};

const normalizePath = (event) => {
  const rawPath = event?.rawPath ?? event?.requestContext?.http?.path ?? '';
  const stage = event?.requestContext?.stage;
  const segments = rawPath.split('/').filter(Boolean);
  if (stage && segments[0] === stage) {
    segments.shift();
  }
  return `/${segments.join('/')}`;
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: defaultHeaders,
  body: body ? JSON.stringify(body) : '',
});

const allowedAttributeTypes = new Set(['number', 'text', 'timeRange', 'duration']);

const ensureAttributes = (input) => {
  if (!input) {
    return [];
  }

  if (!Array.isArray(input)) {
    throw new HttpError(400, 'Attribute müssen als Array übermittelt werden.');
  }

  const seen = new Set();
  const normalized = [];

  input.forEach((attribute, index) => {
    if (!attribute || typeof attribute !== 'object') {
      throw new HttpError(400, `Ungültiges Attribut an Position ${index + 1}.`);
    }

    const id = attribute.id?.toString();
    const name = (attribute.name ?? '').toString().trim();
    const type = attribute.type?.toString();

    if (!id) {
      throw new HttpError(400, 'Attribut-ID fehlt.');
    }

    if (!name) {
      throw new HttpError(400, `Name für Attribut ${id} ist erforderlich.`);
    }

    if (!type || !allowedAttributeTypes.has(type)) {
      throw new HttpError(400, `Ungültiger Typ für Attribut ${name || id}.`);
    }

    if (seen.has(id)) {
      return;
    }

    const unitValue =
      type === 'number'
        ? (() => {
            if (attribute.unit === undefined || attribute.unit === null) {
              return null;
            }
            const trimmed = attribute.unit.toString().trim();
            return trimmed.length ? trimmed : null;
          })()
        : null;

    normalized.push({
      id,
      name,
      type,
      unit: unitValue,
    });

    seen.add(id);
  });

  return normalized;
};

const normalizeDailyTargetNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  const normalized = Number(value);
  if (Number.isNaN(normalized) || normalized < 0) {
    throw new HttpError(400, 'Tägliches Mindestziel muss eine Zahl größer oder gleich 0 sein.');
  }

  return normalized;
};

const ensureMinLogsPerDay = (value) => {
  if (value && typeof value === 'object') {
    return {
      morning: normalizeDailyTargetNumber(value.morning),
      day: normalizeDailyTargetNumber(value.day),
      evening: normalizeDailyTargetNumber(value.evening),
    };
  }

  const normalized = normalizeDailyTargetNumber(value);
  return { morning: normalized, day: 0, evening: 0 };
};

const sanitizeActivityAttributes = (input) => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((attribute) => {
      if (!attribute || typeof attribute !== 'object') {
        return null;
      }

      const id = attribute.id?.toString();
      const name = (attribute.name ?? '').toString();
      const type = attribute.type?.toString();

      if (!id || !name || !allowedAttributeTypes.has(type)) {
        return null;
      }

      const unitValue =
        type === 'number'
          ? (() => {
              if (attribute.unit === undefined || attribute.unit === null) {
                return null;
              }
              const trimmed = attribute.unit.toString().trim();
              return trimmed.length ? trimmed : null;
            })()
          : null;

      return {
        id,
        name,
        type,
        unit: unitValue,
      };
    })
    .filter(Boolean);
};

const sanitizeActivity = (item) => ({
  id: item.id,
  name: item.name,
  icon: item.icon,
  color: item.color,
  active: item.active !== false,
  minLogsPerDay: ensureMinLogsPerDay(item.minLogsPerDay),
  attributes: sanitizeActivityAttributes(item.attributes),
  createdAt: item.createdAt ?? new Date().toISOString(),
  updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
});

const sanitizeLog = (item) => ({
  id: item.id,
  activityId: item.activityId,
  timestamp: item.timestamp,
  note: item.note ?? undefined,
  userId: item.userId,
});

const sanitizeHighlight = (item) => ({
  id: item.id,
  date: item.date,
  title: item.title ?? '',
  text: item.text ?? '',
  photoUrl: item.photoUrl ?? null,
  userId: item.userId,
  createdAt: item.createdAt ?? new Date().toISOString(),
  updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
});

const normalizeHighlightDate = (raw) => {
  if (!raw) {
    throw new HttpError(400, 'Datum ist erforderlich.');
  }

  const date = new Date(raw.toString());
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, 'Ungültiges Datum.');
  }

  return date.toISOString().slice(0, 10);
};

const listActivities = async () => {
  const result = await dynamoClient.send(
    new ScanCommand({
      TableName: ACTIVITIES_TABLE,
    }),
  );

  const items = (result.Items ?? [])
    .map(sanitizeActivity)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return respond(200, { items });
};

const addActivity = async (payload) => {
  const name = (payload?.name ?? '').toString().trim();
  if (!name) {
    throw new HttpError(400, 'Name der Aktivität ist erforderlich.');
  }

  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    name,
    icon: (payload?.icon ?? '💧').toString(),
    color: (payload?.color ?? '#4f46e5').toString(),
    active:
      typeof payload?.active === 'boolean'
        ? payload.active
        : payload?.active === 'false'
        ? false
        : true,
    minLogsPerDay: ensureMinLogsPerDay(payload?.minLogsPerDay),
    attributes: ensureAttributes(payload?.attributes),
    createdAt: now,
    updatedAt: now,
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: ACTIVITIES_TABLE,
      Item: item,
    }),
  );

  return respond(201, { item: sanitizeActivity(item) });
};

const updateActivity = async (payload) => {
  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Aktivitäts-ID fehlt.');
  }

  const expression = [];
  const attributeNames = {};
  const attributeValues = {};

  if (payload?.name !== undefined) {
    expression.push('#name = :name');
    attributeNames['#name'] = 'name';
    attributeValues[':name'] = payload.name.toString().trim();
  }

  if (payload?.icon !== undefined) {
    expression.push('#icon = :icon');
    attributeNames['#icon'] = 'icon';
    attributeValues[':icon'] = payload.icon.toString();
  }

  if (payload?.color !== undefined) {
    expression.push('#color = :color');
    attributeNames['#color'] = 'color';
    attributeValues[':color'] = payload.color.toString();
  }

  if (payload?.active !== undefined) {
    expression.push('#active = :active');
    attributeNames['#active'] = 'active';
    attributeValues[':active'] =
      typeof payload.active === 'boolean'
        ? payload.active
        : payload.active?.toString() === 'false'
        ? false
        : true;
  }

  if (payload?.attributes !== undefined) {
    expression.push('#attributes = :attributes');
    attributeNames['#attributes'] = 'attributes';
    attributeValues[':attributes'] = ensureAttributes(payload.attributes);
  }

  if (payload?.minLogsPerDay !== undefined) {
    expression.push('#minLogsPerDay = :minLogsPerDay');
    attributeNames['#minLogsPerDay'] = 'minLogsPerDay';
    attributeValues[':minLogsPerDay'] = ensureMinLogsPerDay(payload.minLogsPerDay);
  }

  expression.push('#updatedAt = :updatedAt');
  attributeNames['#updatedAt'] = 'updatedAt';
  attributeValues[':updatedAt'] = new Date().toISOString();

  const updateExpression = `SET ${expression.join(', ')}`;

  const result = await dynamoClient.send(
    new UpdateCommand({
      TableName: ACTIVITIES_TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (!result.Attributes) {
    throw new HttpError(404, 'Aktivität wurde nicht gefunden.');
  }

  return respond(200, { item: sanitizeActivity(result.Attributes) });
};

const deleteActivity = async (payload) => {
  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Aktivitäts-ID fehlt.');
  }

  await dynamoClient.send(
    new DeleteCommand({
      TableName: ACTIVITIES_TABLE,
      Key: { id },
    }),
  );

  // Entferne abhängige Logs
  const relatedLogs = await dynamoClient.send(
    new QueryCommand({
      TableName: LOGS_TABLE,
      IndexName: 'activityId-index',
      KeyConditionExpression: '#activityId = :activityId',
      ExpressionAttributeNames: { '#activityId': 'activityId' },
      ExpressionAttributeValues: { ':activityId': id },
    }),
  );

  const deletions = (relatedLogs.Items ?? []).map((log) =>
    dynamoClient.send(
      new DeleteCommand({
        TableName: LOGS_TABLE,
        Key: { id: log.id, timestamp: log.timestamp },
      }),
    ),
  );

  await Promise.all(deletions);

  return respond(200, { success: true });
};

const listLogs = async (payload) => {
  const userId = payload?.userId?.toString();
  const result = await dynamoClient.send(
    new ScanCommand({
      TableName: LOGS_TABLE,
    }),
  );

  let items = result.Items ?? [];
  if (userId) {
    items = items.filter((item) => item.userId === userId);
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return respond(200, { items: items.map(sanitizeLog) });
};

const addLog = async (payload) => {
  const activityId = payload?.activityId?.toString();
  const timestamp = payload?.timestamp?.toString();
  const userId = payload?.userId?.toString();

  if (!activityId || !timestamp || !userId) {
    throw new HttpError(400, 'Aktivität, Zeitpunkt und Benutzer sind erforderlich.');
  }

  const isoTimestamp = new Date(timestamp).toISOString();
  const now = new Date().toISOString();

  const item = {
    id: payload?.id?.toString() ?? crypto.randomUUID(),
    activityId,
    timestamp: isoTimestamp,
    note: payload?.note ? payload.note.toString() : undefined,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await dynamoClient.send(
    new PutCommand({
      TableName: LOGS_TABLE,
      Item: item,
    }),
  );

  return respond(201, { item: sanitizeLog(item) });
};

const findLogById = async (id) => {
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: LOGS_TABLE,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: { '#id': 'id' },
      ExpressionAttributeValues: { ':id': id },
      Limit: 1,
    }),
  );

  return result.Items?.[0];
};

const updateLog = async (payload) => {
  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Log-ID fehlt.');
  }

  const existing = await findLogById(id);
  if (!existing) {
    throw new HttpError(404, 'Log-Eintrag wurde nicht gefunden.');
  }

  const nextTimestamp = payload?.timestamp
    ? new Date(payload.timestamp.toString()).toISOString()
    : existing.timestamp;
  const nextActivityId = payload?.activityId?.toString() ?? existing.activityId;
  const nextNote =
    payload?.note === undefined ? existing.note : payload.note ? payload.note.toString() : undefined;
  const nextUserId = payload?.userId?.toString() ?? existing.userId;
  const updatedAt = new Date().toISOString();

  if (nextTimestamp !== existing.timestamp) {
    await dynamoClient.send(
      new DeleteCommand({
        TableName: LOGS_TABLE,
        Key: { id: existing.id, timestamp: existing.timestamp },
      }),
    );

    const replacement = {
      ...existing,
      activityId: nextActivityId,
      timestamp: nextTimestamp,
      note: nextNote,
      userId: nextUserId,
      updatedAt,
    };

    await dynamoClient.send(
      new PutCommand({
        TableName: LOGS_TABLE,
        Item: replacement,
      }),
    );

    return respond(200, { item: sanitizeLog(replacement) });
  }

  const expression = ['#updatedAt = :updatedAt'];
  const attributeNames = { '#updatedAt': 'updatedAt' };
  const attributeValues = { ':updatedAt': updatedAt };

  if (nextActivityId !== existing.activityId) {
    expression.push('#activityId = :activityId');
    attributeNames['#activityId'] = 'activityId';
    attributeValues[':activityId'] = nextActivityId;
  }

  if (payload?.note !== undefined) {
    expression.push('#note = :note');
    attributeNames['#note'] = 'note';
    attributeValues[':note'] = nextNote ?? null;
  }

  if (nextUserId !== existing.userId) {
    expression.push('#userId = :userId');
    attributeNames['#userId'] = 'userId';
    attributeValues[':userId'] = nextUserId;
  }

  if (expression.length === 1) {
    return respond(200, { item: sanitizeLog({ ...existing, updatedAt }) });
  }

  const result = await dynamoClient.send(
    new UpdateCommand({
      TableName: LOGS_TABLE,
      Key: { id: existing.id, timestamp: existing.timestamp },
      UpdateExpression: `SET ${expression.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (!result.Attributes) {
    throw new HttpError(500, 'Log-Eintrag konnte nicht aktualisiert werden.');
  }

  return respond(200, { item: sanitizeLog(result.Attributes) });
};

const deleteLog = async (payload) => {
  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Log-ID fehlt.');
  }

  let timestamp = payload?.timestamp?.toString();
  if (!timestamp) {
    const existing = await findLogById(id);
    timestamp = existing?.timestamp;
  }

  if (!timestamp) {
    throw new HttpError(404, 'Log-Eintrag wurde nicht gefunden.');
  }

  await dynamoClient.send(
    new DeleteCommand({
      TableName: LOGS_TABLE,
      Key: { id, timestamp },
    }),
  );

  return respond(200, { success: true });
};

const buildHighlightScanInput = ({ userId, dateFilter }) => {
  const params = {
    TableName: HIGHLIGHTS_TABLE,
  };

  const filterExpressions = [];
  const attributeNames = {};
  const attributeValues = {};

  if (userId) {
    filterExpressions.push('#userId = :userId');
    attributeNames['#userId'] = 'userId';
    attributeValues[':userId'] = userId;
  }

  if (dateFilter) {
    filterExpressions.push('#date = :date');
    attributeNames['#date'] = 'date';
    attributeValues[':date'] = dateFilter;
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
    params.ExpressionAttributeNames = attributeNames;
    params.ExpressionAttributeValues = attributeValues;
  }

  return params;
};

const listHighlights = async (payload) => {
  if (!HIGHLIGHTS_TABLE) {
    throw new HttpError(500, 'Highlights-Tabelle ist nicht konfiguriert.');
  }

  const userId = payload?.userId?.toString();
  const dateFilter = payload?.date ? normalizeHighlightDate(payload.date) : null;

  const commandInput = buildHighlightScanInput({ userId, dateFilter });

  const result = await dynamoClient.send(new ScanCommand(commandInput));

  const items = result.Items ?? [];

  const sanitized = items.map(sanitizeHighlight);
  sanitized.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return respond(200, { items: sanitized });
};

const addHighlight = async (payload) => {
  if (!HIGHLIGHTS_TABLE) {
    throw new HttpError(500, 'Highlights-Tabelle ist nicht konfiguriert.');
  }

  const userId = payload?.userId?.toString();
  const title = (payload?.title ?? '').toString().trim();
  const text = (payload?.text ?? '').toString().trim();
  const photoUrl = payload?.photoUrl === undefined || payload?.photoUrl === null
    ? null
    : payload.photoUrl.toString();

  if (!userId) {
    throw new HttpError(400, 'Benutzer ist erforderlich.');
  }

  if (!title) {
    throw new HttpError(400, 'Highlight-Titel ist erforderlich.');
  }

  if (!text) {
    throw new HttpError(400, 'Highlight-Text ist erforderlich.');
  }

  const date = normalizeHighlightDate(payload?.date);
  const now = new Date().toISOString();

  const item = {
    id: payload?.id?.toString() ?? crypto.randomUUID(),
    userId,
    date,
    title,
    text,
    photoUrl,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: HIGHLIGHTS_TABLE,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      throw new HttpError(409, 'Highlight existiert bereits.');
    }
    throw error;
  }

  return respond(201, { item: sanitizeHighlight(item) });
};

const findHighlightById = async (id) => {
  if (!HIGHLIGHTS_TABLE) {
    throw new HttpError(500, 'Highlights-Tabelle ist nicht konfiguriert.');
  }

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: HIGHLIGHTS_TABLE,
      KeyConditionExpression: '#id = :id',
      ExpressionAttributeNames: { '#id': 'id' },
      ExpressionAttributeValues: { ':id': id },
      Limit: 1,
    }),
  );

  return result.Items?.[0];
};

const updateHighlight = async (payload) => {
  if (!HIGHLIGHTS_TABLE) {
    throw new HttpError(500, 'Highlights-Tabelle ist nicht konfiguriert.');
  }

  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Highlight-ID fehlt.');
  }

  const existing = await findHighlightById(id);
  if (!existing) {
    throw new HttpError(404, 'Highlight wurde nicht gefunden.');
  }

  const expression = ['#updatedAt = :updatedAt'];
  const attributeNames = { '#updatedAt': 'updatedAt' };
  const attributeValues = { ':updatedAt': new Date().toISOString() };

  if (payload?.text !== undefined) {
    const nextText = payload.text?.toString().trim();
    if (!nextText) {
      throw new HttpError(400, 'Highlight-Text darf nicht leer sein.');
    }
    expression.push('#text = :text');
    attributeNames['#text'] = 'text';
    attributeValues[':text'] = nextText;
  }

  if (payload?.title !== undefined) {
    const nextTitle = payload.title?.toString().trim();
    if (!nextTitle) {
      throw new HttpError(400, 'Highlight-Titel darf nicht leer sein.');
    }
    expression.push('#title = :title');
    attributeNames['#title'] = 'title';
    attributeValues[':title'] = nextTitle;
  }

  if (payload?.date !== undefined) {
    const nextDate = normalizeHighlightDate(payload.date);
    expression.push('#date = :date');
    attributeNames['#date'] = 'date';
    attributeValues[':date'] = nextDate;
  }

  if (payload?.userId !== undefined) {
    const nextUserId = payload.userId.toString();
    if (nextUserId !== existing.userId) {
      expression.push('#userId = :userId');
      attributeNames['#userId'] = 'userId';
      attributeValues[':userId'] = nextUserId;
    }
  }

  if (payload?.photoUrl !== undefined) {
    const nextPhotoUrl = payload.photoUrl === null ? null : payload.photoUrl.toString();
    expression.push('#photoUrl = :photoUrl');
    attributeNames['#photoUrl'] = 'photoUrl';
    attributeValues[':photoUrl'] = nextPhotoUrl;
  }

  if (expression.length === 1) {
    return respond(200, { item: sanitizeHighlight({ ...existing, updatedAt: attributeValues[':updatedAt'] }) });
  }

  const result = await dynamoClient.send(
    new UpdateCommand({
      TableName: HIGHLIGHTS_TABLE,
      Key: { id },
      UpdateExpression: `SET ${expression.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues,
      ReturnValues: 'ALL_NEW',
    }),
  );

  if (!result.Attributes) {
    throw new HttpError(500, 'Highlight konnte nicht aktualisiert werden.');
  }

  return respond(200, { item: sanitizeHighlight(result.Attributes) });
};

const deleteHighlight = async (payload) => {
  if (!HIGHLIGHTS_TABLE) {
    throw new HttpError(500, 'Highlights-Tabelle ist nicht konfiguriert.');
  }

  const id = payload?.id?.toString();
  if (!id) {
    throw new HttpError(400, 'Highlight-ID fehlt.');
  }

  await dynamoClient.send(
    new DeleteCommand({
      TableName: HIGHLIGHTS_TABLE,
      Key: { id },
    }),
  );

  return respond(200, { success: true });
};

const routeHandlers = {
  '/activities/list': listActivities,
  '/activities/add': addActivity,
  '/activities/update': updateActivity,
  '/activities/delete': deleteActivity,
  '/logs/list': listLogs,
  '/logs/add': addLog,
  '/logs/update': updateLog,
  '/logs/delete': deleteLog,
  '/highlights/list': listHighlights,
  '/highlights/add': addHighlight,
  '/highlights/update': updateHighlight,
  '/highlights/delete': deleteHighlight,
};

exports.handler = async (event) => {
  if (event?.requestContext?.http?.method === 'OPTIONS') {
    return respond(204, null);
  }

  try {
    const path = normalizePath(event);
    const handler = routeHandlers[path];

    if (!handler) {
      throw new HttpError(404, `Route ${path} wurde nicht gefunden.`);
    }

    const payload = safeParseJson(event?.body);
    return await handler(payload ?? {});
  } catch (error) {
    console.error('API Fehler', error);
    if (error instanceof HttpError) {
      return respond(error.statusCode, { message: error.message });
    }
    return respond(500, { message: 'Interner Serverfehler' });
  }
};
