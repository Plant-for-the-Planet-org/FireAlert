// Function to send a webhook
export const sendWebhook = async (url: string, payload: Record<string, any>): Promise<boolean> => {
    try {
        // Send the webhook request
        await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json",
            },
        });

        return true; // Webhook sent successfully
    } catch (error) {
        console.error("Error sending webhook:", error);
        return false; // Failed to send webhook
    }
};
