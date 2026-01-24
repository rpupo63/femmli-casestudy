// Oura API integration service
// Note: This is a simplified implementation. In production, you'd need:
// 1. OAuth2 flow with Oura
// 2. Proper token refresh handling
// 3. Error handling and retries
const OURA_API_BASE = 'https://api.ouraring.com/v2';
/**
 * Fetch sleep data from Oura API
 * @param accessToken Oura OAuth access token
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 */
export async function fetchOuraSleepData(accessToken, startDate, endDate) {
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };
    // Fetch daily sleep summaries
    const dailyResponse = await fetch(`${OURA_API_BASE}/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`, { headers });
    if (!dailyResponse.ok) {
        const error = await dailyResponse.text();
        throw new Error(`Oura API error (daily): ${dailyResponse.status} - ${error}`);
    }
    const dailyData = (await dailyResponse.json());
    // Fetch sleep sessions for detailed data
    const sessionsResponse = await fetch(`${OURA_API_BASE}/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`, { headers });
    if (!sessionsResponse.ok) {
        const error = await sessionsResponse.text();
        throw new Error(`Oura API error (sessions): ${sessionsResponse.status} - ${error}`);
    }
    const sessionsData = (await sessionsResponse.json());
    return {
        daily: dailyData.data || [],
        sessions: sessionsData.data || [],
    };
}
/**
 * Convert Oura sleep data to our sleep log format
 */
export function convertOuraToSleepLog(daily, sessions) {
    // Find the primary sleep session for this day (long_sleep, not nap)
    const primarySession = sessions.find(s => s.type === 'long_sleep' && s.start_datetime.startsWith(daily.day));
    // Calculate total sleep from sessions if available, otherwise use daily data
    let totalSleep = null;
    let deepSleep = null;
    let remSleep = null;
    let lightSleep = null;
    if (primarySession) {
        // Convert from seconds to minutes
        totalSleep = primarySession.total_sleep_duration
            ? Math.round(primarySession.total_sleep_duration / 60)
            : null;
        deepSleep = primarySession.deep_sleep_duration
            ? Math.round(primarySession.deep_sleep_duration / 60)
            : null;
        remSleep = primarySession.rem_sleep_duration
            ? Math.round(primarySession.rem_sleep_duration / 60)
            : null;
        lightSleep = primarySession.light_sleep_duration
            ? Math.round(primarySession.light_sleep_duration / 60)
            : null;
        // If we don't have individual sleep stages, calculate from total
        if (totalSleep && !deepSleep && !remSleep && !lightSleep) {
            // Estimate based on typical sleep stage distribution
            deepSleep = Math.round(totalSleep * 0.15);
            remSleep = Math.round(totalSleep * 0.20);
            lightSleep = totalSleep - deepSleep - remSleep;
        }
    }
    else if (daily.contributors?.total_sleep) {
        // Fallback to daily data (in minutes already)
        totalSleep = Math.round(daily.contributors.total_sleep);
        deepSleep = daily.contributors.deep_sleep
            ? Math.round(daily.contributors.deep_sleep)
            : Math.round(totalSleep * 0.15);
        remSleep = daily.contributors.rem_sleep
            ? Math.round(daily.contributors.rem_sleep)
            : Math.round(totalSleep * 0.20);
        lightSleep = totalSleep - (deepSleep || 0) - (remSleep || 0);
    }
    // Get sleep score (prefer daily score, fallback to session score)
    const sleepScore = daily.score
        || daily.contributors?.total_sleep
        || primarySession?.sleep_score_total
        || null;
    // Get efficiency (percentage)
    const efficiency = daily.contributors?.efficiency
        || primarySession?.sleep_efficiency
        || null;
    // Get restfulness score
    const restfulness = daily.contributors?.restfulness
        || primarySession?.sleep_score_disturbances
        || null;
    return {
        log_date: daily.day,
        sleep_score: sleepScore,
        total_sleep: totalSleep,
        deep_sleep: deepSleep,
        rem_sleep: remSleep,
        light_sleep: lightSleep,
        sleep_efficiency: efficiency,
        restfulness: restfulness,
    };
}
