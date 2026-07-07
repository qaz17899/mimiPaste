export class UserVisibleError extends Error {
  readonly detail: string

  constructor(detail: string) {
    super(detail)
    this.name = "UserVisibleError"
    this.detail = detail
  }
}
