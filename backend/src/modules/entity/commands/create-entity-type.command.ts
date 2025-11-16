export class CreateEntityTypeCommand {
  constructor(
    public readonly name: string,
    public readonly schema: Record<string, unknown>,
    public readonly description?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
