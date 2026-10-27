import * as packageService from '../packageController.js';

export const getPackageCategories = packageService.getPackageCategories;
export const getPackages = packageService.getPackages;
export const purchasePackage = packageService.purchasePackage;
export const getUserPrivileges = packageService.getUserPrivileges;
export const checkRoomActionPrivilege = packageService.checkRoomActionPrivilege;
export const getMyPackages = packageService.getMyPackages;
export const togglePackageActive = packageService.togglePackageActive;
export const getPackagesByCategory = packageService.getPackagesByCategory;
export const getVipPrivilegesCatalog = packageService.getVipPrivilegesCatalog;
export const MASTER_PRIVILEGES_CATALOG = packageService.MASTER_PRIVILEGES_CATALOG;
