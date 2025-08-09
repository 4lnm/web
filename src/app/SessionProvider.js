    "use client";
import { SessionProvider } from "next-auth/react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import React from "react";
import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from 'sonner';


export function AuthProvider({ children, session }) {

    React.useEffect(() => {
        // Only run this effect in the browser
        if (typeof window !== 'undefined') {
            // Check if the toast has already been shown
            const hasToastShown = sessionStorage.getItem('toastShown');

            if (!hasToastShown && session?.user) {
                // Display the toast
                toast.success(`Welcome Back, ${session.user.name}! You are currently logged in. Enjoy your time with us.`);
                // Set the flag in sessionStorage
                sessionStorage.setItem('toastShown', 'true');
            }
        }
    }, [session]);

    return (
        <SessionProvider session={session}>
            <SkeletonTheme baseColor="#f300aaff" highlightColor="#e4489eff" borderRadius={"0.5rem"}>
                {children}
            </SkeletonTheme>
            <ProgressBar
                height="3px"
                color="#6E00FF"
                options={{ showSpinner: true }}
            // shallowRouting // by enabling this progressbar does not show on query params change
            />
        </SessionProvider>
    );
}
