/**
 * OpenTelemetry Stub Module
 *
 * Comprehensive no-op stub for all OpenTelemetry modules used by aioncli-core.
 * Telemetry is optional and not needed for HiveMind's core functionality.
 * This single file handles ALL @opentelemetry/* imports via NormalModuleReplacementPlugin.
 */

// --- @opentelemetry/api ---
const noopSpan = {
  setAttribute: () => noopSpan,
  setAttributes: () => noopSpan,
  addEvent: () => noopSpan,
  setStatus: () => noopSpan,
  updateName: () => noopSpan,
  end: () => {},
  isRecording: () => false,
  recordException: () => {},
  spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
};

const noopTracer = {
  startSpan: () => noopSpan,
  startActiveSpan: (_name: string, ...args: any[]) => {
    const fn = args[args.length - 1];
    return typeof fn === 'function' ? fn(noopSpan) : noopSpan;
  },
};

const noopCounter = { add: () => {} };
const noopHistogram = { record: () => {} };
const noopUpDownCounter = { add: () => {} };
const noopObservableGauge = { addCallback: () => {} };

const noopMeter = {
  createCounter: () => noopCounter,
  createHistogram: () => noopHistogram,
  createUpDownCounter: () => noopUpDownCounter,
  createObservableGauge: () => noopObservableGauge,
  createObservableCounter: () => noopObservableGauge,
  createObservableUpDownCounter: () => noopObservableGauge,
};

export const trace = {
  getTracer: () => noopTracer,
  setGlobalTracerProvider: () => {},
  getTracerProvider: () => ({ getTracer: () => noopTracer }),
};

export const metrics = {
  getMeter: () => noopMeter,
  setGlobalMeterProvider: () => {},
  getMeterProvider: () => ({ getMeter: () => noopMeter }),
};

export const context = {
  active: () => ({}),
  with: (_ctx: any, fn: Function) => fn(),
  bind: (_ctx: any, fn: any) => fn,
  setValue: () => ({}),
  getValue: (): undefined => undefined,
};

export const propagation = {
  inject: () => {},
  extract: () => ({}),
  setGlobalPropagator: () => {},
};

export const diag = {
  setLogger: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  verbose: () => {},
};

export const api = { trace, metrics, context, propagation, diag };

export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

export enum ValueType {
  INT = 0,
  DOUBLE = 1,
}

export enum DiagLogLevel {
  NONE = 0,
  ERROR = 30,
  WARN = 50,
  INFO = 60,
  DEBUG = 70,
  VERBOSE = 80,
  ALL = 9999,
}

// --- @opentelemetry/api-logs ---
const noopLogger = { emit: () => {} };
export const logs = {
  getLogger: () => noopLogger,
  setGlobalLoggerProvider: () => {},
  getLoggerProvider: () => ({ getLogger: () => noopLogger }),
};

// --- @opentelemetry/core ---
export const hrTimeToMilliseconds = () => 0;
export enum ExportResultCode {
  SUCCESS = 0,
  FAILED = 1,
}

// --- @opentelemetry/semantic-conventions ---
export const SemanticAttributes = new Proxy({}, { get: () => '' });
export const SemanticResourceAttributes = new Proxy({}, { get: () => '' });

// --- @opentelemetry/resources ---
export const resourceFromAttributes = () => ({});
export class Resource {
  static default() {
    return new Resource();
  }
  static empty() {
    return new Resource();
  }
  merge() {
    return this;
  }
}

// --- @opentelemetry/sdk-metrics ---
export enum AggregationTemporality {
  DELTA = 0,
  CUMULATIVE = 1,
}

export class MeterProvider {
  getMeter() {
    return noopMeter;
  }
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
  addMetricReader() {}
}

export class ConsoleMetricExporter {
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

export class PeriodicExportingMetricReader {
  constructor() {}
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
}

// --- @opentelemetry/sdk-trace-node / sdk-trace-base ---
export class TracerProvider {
  getTracer() {
    return noopTracer;
  }
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
  addSpanProcessor() {}
  register() {}
}

export class BatchSpanProcessor {
  constructor() {}
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
  onStart() {}
  onEnd() {}
}

export class ConsoleSpanExporter {
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

export class SimpleSpanProcessor extends BatchSpanProcessor {}

// --- @opentelemetry/sdk-logs ---
export class LoggerProvider {
  getLogger() {
    return noopLogger;
  }
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
  addLogRecordProcessor() {}
}

export class BatchLogRecordProcessor {
  constructor() {}
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
  onEmit() {}
}

export class ConsoleLogRecordExporter {
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

// --- @opentelemetry/sdk-node ---
export class NodeSDK {
  constructor() {}
  start() {}
  shutdown() {
    return Promise.resolve();
  }
}

// --- @opentelemetry/otlp-exporter-base ---
export enum CompressionAlgorithm {
  NONE = 'none',
  GZIP = 'gzip',
}

// --- OTLP Exporters (grpc + http) ---
export class OTLPTraceExporter {
  constructor() {}
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

export class OTLPMetricExporter {
  constructor() {}
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

export class OTLPLogExporter {
  constructor() {}
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

// --- @opentelemetry/instrumentation-http ---
export class HttpInstrumentation {
  constructor() {}
  setTracerProvider() {}
  setMeterProvider() {}
  enable() {}
  disable() {}
}

// --- @opentelemetry/auto-instrumentations-node ---
export const getNodeAutoInstrumentations = (): never[] => [];
export const registerInstrumentations = () => {};

// --- @google-cloud/opentelemetry-cloud-trace-exporter ---
export class TraceExporter {
  constructor() {}
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

// --- @google-cloud/opentelemetry-cloud-monitoring-exporter ---
export class MetricExporter {
  constructor() {}
  export() {}
  shutdown() {
    return Promise.resolve();
  }
}

// --- Meter/Counter/Histogram classes for type compatibility ---
export class Meter {
  createCounter() {
    return noopCounter;
  }
  createHistogram() {
    return noopHistogram;
  }
  createUpDownCounter() {
    return noopUpDownCounter;
  }
  createObservableGauge() {
    return noopObservableGauge;
  }
}

export class Counter {
  add() {}
}
export class Histogram {
  record() {}
}

// Default export
export default {
  trace,
  metrics,
  context,
  propagation,
  diag,
  api,
  logs,
  SpanStatusCode,
  ValueType,
  DiagLogLevel,
};
