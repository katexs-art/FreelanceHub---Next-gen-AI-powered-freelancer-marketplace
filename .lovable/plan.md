Apply exact styling fixes to the `/forgot-password` page ("Reset password" email form) without changing any other page or shared component behavior.

Scope: only `src/pages/auth/ForgotPassword.tsx`. All other files, pages, components, and auth flows remain untouched.

### What to change in `ForgotPassword.tsx`
1. **Stop importing `Input` and `Button`** from shared UI components.
2. **Stop passing the `footer` prop to `AuthLayout`** — render the "Back to sign in" link inside `children` so it can be styled exactly without affecting the shared `AuthLayout` footer styles.
3. **Replace the email `<Input>` with an inline `<input>`** styled exactly to spec:
   - `background: #F7F7F7`, `border: 1.5px solid #CCCCCC`, `border-radius: 12px`, `height: 52px`, `padding: 0 16px`, `font-size: 15px`, `color: #0A0A0A`, `width: 100%`
   - Focus: `border-color: #0A0A0A`, `background: #FFFFFF`, `box-shadow: 0 0 0 3px rgba(0,0,0,0.06)`
   - Placeholder: `color: #AAAAAA`, text `"Enter your email address"`
4. **Style the "Email" label** exactly:
   - `font-size: 13px`, `font-weight: 500`, `color: #333333`, `margin-bottom: 8px`, `display: block`
5. **Replace the `<Button>` with an inline `<button>`** styled exactly:
   - `background: #0A0A0A`, `color: #FFFFFF`, `border: none`, `border-radius: 12px` (NOT a pill), `height: 52px`, `width: 100%`, `font-size: 15px`, `font-weight: 600`, `cursor: pointer`
   - Hover: `background: #333333`, `transition: 0.2s`
6. **Style "Back to sign in" link** exactly:
   - `font-size: 14px`, `color: #888888`, hover `color: #0A0A0A`, `cursor: pointer`, `text-decoration: underline` on hover, `transition: 0.2s`
7. **Wrap the form area in a card container** with exact specs:
   - `background: #FFFFFF`, `border-radius: 20px`, `padding: 48px`, `max-width: 440px`, `box-shadow: 0 8px 40px rgba(0,0,0,0.12)`
   - Because `AuthLayout` renders the KATEXS logo, heading, and subtitle before `{children}`, the card wrapper will be placed inside `children` and will contain the heading, subtitle, form, and footer link — matching the requested modal-like appearance.
8. **Preserve all existing functionality**: the `submit` handler, `supabase.auth.resetPasswordForEmail` call, `sent` state, `toast` error handling, and `loading` state all stay exactly as-is.

No other files are touched. `AuthLayout.tsx`, `Input.tsx`, `Button.tsx`, `Login.tsx`, `Signup.tsx`, `ResetPassword.tsx`, and all other routes and components remain unchanged.