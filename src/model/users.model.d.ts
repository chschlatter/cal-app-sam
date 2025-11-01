export type Role = "admin" | "user";

export type User = {
  name: string;
  role: Role;
  googleId?: string;
  color: string;
};

export type Users = {
  [name: string]: User;
};

export declare class UsersModel {
  constructor();

  static readUsersFromJSON(): Users | Error;

  getUsers(): Users;

  getUser(name: string): User | undefined;

  getUserRole(name: string): Role | undefined;

  getUserColor(userName: string): string | undefined;

  isValidUser(name: string): boolean;
}
