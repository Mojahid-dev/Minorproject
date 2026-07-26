import * as z from "zod";

export const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }).max(128, { message: "Password must be at most 128 characters long" }),
},
)

export const signUpSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }).max(128, { message: "Password must be at most 128 characters long" }),
    confirmPassword: z.string().min(8, { message: "Confirm Password must be at least 8 characters long" }).max(128, { message: "Confirm Password must be at most 128 characters long" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",  
    path: ["confirmPassword"]
});
