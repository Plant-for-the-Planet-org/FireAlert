import { type NotificationParameters } from "../../../src/Interfaces/NotificationParameters";
import NotifierRegistry from '../../Services/Notifier/NotifierRegistry';
import { logger } from "../../../src/server/logger";


const emailUserRegardingMultiPolygonSitesBeingConvertedToPolygonSites = async(userInfo:UserInfo) => {
    const params: NotificationParameters = {
        message: `<p>Dear ${userInfo.name},</p>
        
        <p>We are committed to continually improving our FireAlert service for better accuracy and ease of use. As part of this effort, we are updating how we manage and track sites with complex shapes (MultiPolygons).</p>

        <p><strong>What's Changing?</strong></p>
        
        <ul>
            <li>We have separated sites previously defined as MultiPolygons into individual Polygon sites.</li>
            <li>This change allows for more precise tracking and alerting in your area.</li>
        </ul>

        <p><strong>What Do You Need to Do?</strong></p>
        
        <ul>
            <li>No action is required on your part. We have automatically updated your sites.</li>
            <li>You may notice new site names like "Site 1 ${userInfo.multiPolygon[0].name}" in your dashboard.</li>
        </ul>

        <p>We appreciate your understanding and are here to assist you with any questions or concerns.</p>
        
        <p>Thank you for using FireAlert.</p>
        
        <p>Best regards,<br>The FireAlert Team</p>`,
        subject: 'Important Update on Your FireAlert Sites',
    };
    const notifier = NotifierRegistry.get('email');
    await notifier.notify(userInfo.email, params);
    return true;
}

export const bulkEmailUsersRegardingMultiPolygonSites = async (userInfos: UserInfo[]) => {
    const emailPromises = userInfos.map(userInfo => {
        return emailUserRegardingMultiPolygonSitesBeingConvertedToPolygonSites(userInfo);
    });

    const results = await Promise.allSettled(emailPromises);

    let successCount = 0;
    let failureCount = 0;

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value === true) {
            successCount++;
        } else {
            failureCount++;
        }
    });
    logger(`Emails sent successfully: ${successCount}`, 'info');
    logger(`Emails failed to send: ${failureCount}`, 'info');
    
    return{
        sentCount: successCount
    }
}