export class ApplyEventCommand {
  constructor(
    public readonly entityInstanceId: string,
    public readonly eventType: string,
    public readonly payload: Record<string, unknown>,
    public readonly correlationId?: string,
    public readonly causationId?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
