    class RateLimiter {
    constructor(maxRequestsPerSecond) {
        this.queue = [];
        this.isProcessing = false;
        this.delay = 1000 / maxRequestsPerSecond;
    }

    enqueue(fn) {
        return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
        if (!this.isProcessing) this.processQueue();
        });
    }

    async processQueue() {
        this.isProcessing = true;

        while (this.queue.length) {
        const { fn, resolve, reject } = this.queue.shift();
        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        }
        await new Promise(r => setTimeout(r, this.delay));
        }

        this.isProcessing = false;
    }
    }
 //test
    export const apiRateLimiter = new RateLimiter(10); 
