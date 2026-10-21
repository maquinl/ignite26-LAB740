# Welcome to your lab environment

Before you build your strategic partner agent, sign in to the virtual machine and choose a workshop account.

For this workshop, you will use a provided user account with pre-populated sample data available through Work IQ. You will create a Human Persona for the person represented by that account, then build a strategic partner for that persona. Throughout the workshop, "I," "me," and "my" in the prompts refer to the signed-in account's persona, not your own identity.

At the end of the workshop, we will share a link to these instructions so you can revisit them and, if you wish, repeat the workshop with your own work account.

## Sign in to the virtual machine

Start by signing in to the virtual machine using the credentials below:

- **Username:** +++@lab.VirtualMachine(Win11-Pro-Base).Username+++
- **Password:** +++@lab.VirtualMachine(Win11-Pro-Base).Password+++

## Open Microsoft 365 Copilot

In the virtual machine, open Microsoft Edge and go to:

+++https://m365.cloud.microsoft/chat+++

## Choose and sign in with a workshop account

You can use **Alex Wilber (`AlexW`)**, the default account, or optionally choose the account whose role most closely matches yours.

| Name | User alias | Role |
| --- | --- | --- |
| Alex Wilber | `AlexW` | Marketing |
| Allan Deyoung | `AllanD` | IT Admin |
| Diego Siciliani | `DiegoS` | HR Manager |
| Isaiah Langer | `IsaiahL` | Sales |
| Joni Sherman | `JoniS` | Paralegal |
| Lynne Robbins | `LynneR` | Planner (Retail) |
| Megan Bowen | `MeganB` | Marketing Manager |
| Nestor Wilke | `NestorW` | Director |
| Patti Fernandez | `PattiF` | Exec Management |

Sign in with the credentials below. The username uses the default alias, `AlexW`, followed by your assigned tenant domain:

- **Username:** +++AlexW@@lab.CloudCredential(WWLM365E7).TenantName+++
- **Password:** +++@lab.CloudCredential(WWLM365E7).UserPassword+++

To use a different account, copy its **User alias** from the table. Paste the default username into the sign-in field, then replace only the leading `AlexW` with your chosen alias. Keep the `@` and tenant domain unchanged.

For example, to use **Patti Fernandez**, replace `AlexW` with `PattiF`. The resulting username is:

+++PattiF@@lab.CloudCredential(WWLM365E7).TenantName+++

> [!TIP]
> If the sign-in page asks for a temporary access pass, use:
>
> **Temporary access pass:** +++@lab.Variable(TAP)+++

Use the same selected account for the rest of the workshop. Your Human Persona and strategic partner will reflect that account's sample work context.

When you are signed in, select **Next** to continue to the Workshop instructions.
