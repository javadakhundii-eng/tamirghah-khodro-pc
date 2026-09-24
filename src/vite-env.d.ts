/// <reference types="vite/client" />
declare global { interface Window { repairshop: { login(pin:string):Promise<boolean>; dashboard():Promise<Record<string,number>>; list(type:string):Promise<any[]>; create(type:string,data:any):Promise<any[]>; addWorkOrder(data:any):Promise<any[]>; databasePath():Promise<string> } } } export {};
