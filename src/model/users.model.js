// @ts-check

/**
 * @typedef {"admin" | "user"} Role
 * @typedef {{name: string, role: Role, googleId?: string, color: string}} User
 * @typedef {Object.<string, User>} Users
 */

/**
 * @class UsersModel
 * @classdesc A class to handle users
 */
export class UsersModel {
  /** @type {Users} */ #users;

  constructor() {
    if (usersFromJSON instanceof Error) {
      throw usersFromJSON;
    }
    this.#users = usersFromJSON;
  }

  /**
   * read users from JSON file
   * @returns {Users | Error} - Users
   */
  static readUsersFromJSON() {
    try {
      const usersFromJSON = require("../../users.json");
      const validUsers = /** @type {Users} */ ({});
      for (const [name, user] of Object.entries(usersFromJSON)) {
        const validUser = /** @type {User} */ (user);
        validUser.name = name;
        if (user.role !== "admin" && user.role !== "user") {
          throw new Error(`Invalid role for user ${name}`);
        }
        validUser.role = user.role;
        if (user.role === "admin") {
          if (!("googleId" in user)) {
            throw new Error(`Admin user ${name} must have a googleId`);
          }
          validUser.googleId = user.googleId;
        }
        if (!("color" in user)) {
          throw new Error(`User ${name} must have a color`);
        }
        validUser.color = user.color;
        validUsers[name] = validUser;
      }
      return validUsers;
    } catch (err) {
      return err;
    }
  }

  /**
   * get users
   * @returns {Users} - Users
   */
  getUsers() {
    return this.#users;
  }

  /**
   * get user
   * @param {string} name - User name
   * @returns {User | undefined} - User
   */
  getUser(name) {
    return this.#users[name];
  }

  /**
   * get user role
   * @param {string} name - User name
   * @returns {Role | undefined} - Role
   */
  getUserRole(name) {
    return this.#users[name]?.role;
  }

  /**
   * Get color of user
   * @param {string} userName - Name of user
   * @returns {string | undefined} - Color
   */
  getUserColor(userName) {
    return this.#users[userName]?.color;
  }

  /**
   * Check if user is valid
   * @param {string} name - User name
   * @returns {boolean} - User is valid
   */
  isValidUser(name) {
    return this.#users[name] !== undefined;
  }
}

const usersFromJSON = UsersModel.readUsersFromJSON();
