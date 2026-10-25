/** An error with an HTTP status; the error middleware sends it as `{ error: message }`. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}
