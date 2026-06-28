/**
 * Polling utility function
 * Polls a status-checking function until completion or timeout
 * @param {Function} statusFn - Async function that returns a status value
 * @param {Function} isCompleteFn - Function that determines if polling is complete
 * @param {number} interval - Polling interval in milliseconds
 * @param {number} timeout - Maximum polling time in milliseconds
 * @returns {Promise<Object>} Final status object
 * @throws {Error} If polling times out or status function fails
 */
const pollUntilComplete = async (
  statusFn,
  isCompleteFn,
  interval = 3000,
  timeout = 600000,
) => {
  const startTime = Date.now();
  const maxTime = startTime + timeout;

  let lastStatus;

  while (Date.now() < maxTime) {
    try {
      lastStatus = await statusFn();

      if (isCompleteFn(lastStatus)) {
        return {
          complete: true,
          status: lastStatus,
          duration: Date.now() - startTime,
        };
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("[Polling Error]", error.message);
      throw error;
    }
  }

  throw new Error(
    `Polling timeout after ${timeout}ms. Last status: ${JSON.stringify(lastStatus)}`,
  );
};

module.exports = {
  pollUntilComplete,
};
