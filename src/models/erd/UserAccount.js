/** ERD entity: UserAccount */
export class UserAccount {
  constructor({ AccountID, Username, PasswordHash, Role, IsActive = true }) {
    Object.assign(this, { AccountID, Username, PasswordHash, Role, IsActive });
  }
}
