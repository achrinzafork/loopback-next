import {LifeCycleObserver} from './lifecycle';

/**
 * Used by `Auditors` to create both static and dynamic audit entries to be
 * passed to `@loopback/core`.
 */
export interface BaseAuditEntry {
  /**
   * A short, recognisable string to identify the incident.
   */
  title: string;

  /**
   * A longer descriptive string to explain the incident.
   */
  description: string;
}

/**
 * Must only be used by `@loopback/core` to generate static audit entries from
 * `BaseAuditEntry`.
 */
export interface StaticAuditEntry extends BaseAuditEntry {}

/**
 * Must only be used by `@loopback/core` to generate dynamic audit entries from
 * `BaseAuditEntry`.
 */
export interface DynamicAuditEntry extends BaseAuditEntry {
  /**
   * The time of which the audit entry was received.
   */
  timestamp: Date;
}

export interface AuditorConfig {
  rules: AuditorRule[];
}

/**
 * A rule to dictate the action to be taken (and optionally, the threshold)
 *
 * @remarks
 * - 'error' indicates that the application should terminate immediately. This
 * is useful to ensure that the application returns to a safe state.
 * - 'warning' indicates that the application should log the error, but not take
 * any other action. This is useful for testing new rules on an existing
 * application.
 * - _an integer_ - indicates that the application should only log the incident
 * _x_ times, then immediately terminate after the next incident.
 */
export interface AuditorRule {
  [key: string]: 'error' | 'warning' | 'off' | number;
}

/**
 * The base interface for `StaticAuditor` and `DynamicAuditor`
 *
 * @remarks
 * This **must not** be used anywhere else beyond as the common base of
 * `StaticAudtor` and `DynamicAuditor`.
 *
 * @internal
 */
export interface BaseAuditor {
  /**
   * The display name of the auditor, solely used for identifying
   * and differentiating between auditors in logs. It _should_ be unique, but name
   * collisions will not break the program.
   */
  name: string;
}

/**
 * An auditor that only performs analysis after initial application start.
 */
export interface StaticAuditor extends BaseAuditor {
  run(): void;
}

/**
 * An auditor that only performs analysis based on abitrary triggers and hooks
 * throughout the lifecycle of the application instance.
 */
export interface DynamicAuditor extends BaseAuditor, LifeCycleObserver {}
