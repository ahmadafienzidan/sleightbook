import { dataSource } from "./dataSource";

export const getRoutine = async (id: string) => dataSource.getRoutine(id);
