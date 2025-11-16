export class CreateEntityInstanceCommand {
  constructor(
    public readonly entityTypeId: string,
    public readonly externalId: string,
    public readonly initialState: Record<string, unknown>,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
