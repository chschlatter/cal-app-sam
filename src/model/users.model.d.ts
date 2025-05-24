/**
 * @class UsersModel
 * @classdesc A class to handle users
 */
export declare class UsersModel {
  constructor();

  static readUsersFromJSON(): Users | Error;

  getUsers(): Users;

  getUser(name: string): User | undefined;

  getUserRole(name: string): Role | undefined;

  isValidUser(name: string): boolean;

  getUserColor(name: string): string | undefined;

  getUserName(name: string): string | undefined;

  getUserGoogleId(name: string): string | undefined;
}

/**
 * Represents a user.
 */
export interface User {
  name: string;
  role: "admin" | "user";
  googleId?: string;
}

/**
 * Represents a collection of users.
 */
export interface Users {
  [name: string]: User;
}

/**
 * Represents a role of a user.
 */
export type Role = "admin" | "user";
