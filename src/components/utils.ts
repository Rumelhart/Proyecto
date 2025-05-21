const COST_PER_MINUTE = 90;
const FIXED_COST_AFTER_120_MINUTES = 10900; // Tarifa fija después de 120 minutos

export const calculateCostNumeric = (timestamp: Date): number => {
    const currentTime = new Date();
    const totalMinutes: number = Math.floor((currentTime.getTime() - timestamp.getTime()) / 60000);

    if (totalMinutes <= 120) {
        return totalMinutes * COST_PER_MINUTE; // Tarifa normal para los primeros 120 minutos
    } else {
        return FIXED_COST_AFTER_120_MINUTES; // Tarifa fija a partir de los 121 minutos
    }
};
