import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import paypal from '@paypal/checkout-server-sdk';

const app = express();
app.use(bodyParser.json());
app.use(cors());

const EXCHANGE_RATE_API_KEY = 'd4c904a676a814a0c32c16f2'; 
const payPalClient = () => {
    const clientId = 'AcGs_32-5U0VRjwqT1lVdwfyDRYtuP5satCz_BQOfzZnvohImbNYxCVitT2_2I7Yr_eBc60EGGZAB2um'; 
    const clientSecret = 'EE_tLx6zGKfnQXDOmC65r2jYT-4E4eIYdD46mdOZFZdJMrYMxHglWXsNMn77KaDNjRjnQ8DbGUTfHB4G'; 
    const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
    const client = new paypal.core.PayPalHttpClient(environment);
    return client;
};

app.get('/', (req, res) => {
    res.send('Hola Mundo desde el Convertidor de Moneda y PayPal');
});

app.post('/create_payment', async (req, res) => {
    const { amountCOP } = req.body;

    try {
        // Obtener la tasa de cambio COP a USD
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/COP/USD`);
        const exchangeRate = response.data.conversion_rate;
        console.log(`Tasa de cambio obtenida: ${exchangeRate}`);

        // Convertir el monto de COP a USD
        const amountInUSD = (amountCOP * exchangeRate).toFixed(2);
        console.log(`Monto convertido a USD: ${amountInUSD}`);

        // Crear el pago en PayPal con el monto en USD
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: amountInUSD,
                }
            }]
        });

        const order = await payPalClient().execute(request);
        console.log("Respuesta de PayPal:", order.result);
        res.json({ id: order.result.id, amountInUSD }); // Incluimos el valor en USD en la respuesta
    } catch (error) {
        console.error("Error al crear el pago en PayPal:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});
