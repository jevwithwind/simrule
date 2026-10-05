# Chatbase setup guide (about 45 minutes)

Goal: a new Chatbase agent called **Simrule Regulatory Assistant**, trained on the files in this folder, with the chat widget allowed on `jevwithwind.github.io`. Then send the widget script and Help page URL back to Claude Code with the Phase 7 message.

Chatbase changes its menus from time to time. If a label below differs slightly, look for the closest match. Each step has a time cap; if you hit it, note the problem and move on or stop as the step says.

> **Do not modify or delete the existing "SimWard Assistant" agent.** It must stay live until the earlier assignment is graded. Do not retrain it, rename it, change its sources, instructions, model or widget, and do not reuse it for Simrule.

## Steps

1. **Check the agent limit first (3 min).**
   Log in to Chatbase. Open the workspace or plan settings and check how many agents your plan allows and how many you have.
   - If you can create another agent, go to step 2.
   - If the limit blocks a second agent, **stop here** and pick one fallback:
     a. Upgrade the plan for one month, create the new agent, then downgrade after the course (check that downgrading will not disable SimWard).
     b. Create a separate Chatbase workspace or account for Simrule if your plan and Chatbase's terms allow it.
     c. Skip the chatbot for now. It is optional and the app works without it. Send the Phase 7 message with `none` for the two Chatbase fields; the report will keep the chatbot as a placeholder.
     d. Wait until the SimWard assignment is graded, then create the Simrule agent (still never repurpose SimWard).

2. **Create the agent (3 min).**
   Create a new agent. Name it **Simrule Regulatory Assistant**. If Chatbase asks for a first source, skip it or use step 3.

3. **Add the text sources (8 min).**
   Go to **Sources → Files** (or Text). Upload the 10 files in `deliverables/chatbot/sources/` (`01-about-simrule-and-scope.txt` to `10-glossary.txt`). Together they are under 60,000 characters.

4. **Add the Q&A pairs (10 min).**
   Go to **Sources → Q&A**. Add the 28 pairs from `deliverables/chatbot/qa-pairs.md`, one question and answer per entry. Copy the answer text only, not the bold numbering.

5. **Retrain (2 min).**
   Click **Retrain agent** (or Train) and wait until it finishes.

6. **Set the model and temperature (2 min).**
   In **Settings → AI**, choose a standard, fast model from the list (not a premium reasoning model). Set **temperature to 0.2**. Save.

7. **Paste the instructions (2 min).**
   In the **Instructions** (system prompt) field, paste the text inside the box in `deliverables/chatbot/instructions.md`. Save.

8. **Run the test script (10 min).**
   Open the **Playground**. Ask the 15 questions in `deliverables/chatbot/test-script.md` and mark Pass or Fail. If something fails, add or edit a Q&A pair or tighten the instructions, retrain, and re-run only the failed questions. Cap: two rounds of fixes.

9. **Turn the widget on (3 min).**
   Go to **Deploy → Chat widget**. Confirm the widget **Visibility** setting is **ON** (or Public). Last time it defaulted to off and the chat bubble did not appear.

10. **Set the allowed domain (2 min).**
    In the widget or security settings, add the allowed domain exactly as:
    `jevwithwind.github.io`
    No `https://`, no path, no trailing slash. Save.

11. **Copy the widget script and Help page URL (2 min).**
    - Copy the **chat widget script** (the `<script>` embed code), **not** the iframe.
    - Copy the **Help page** URL (the standalone page link for the agent).
    Paste both into a plain text editor first and check that the domain inside the script has not been changed by copy and paste.

12. **Return to Claude Code (1 min).**
    Send this message, filled in:

```
Phase 7.
Chatbase widget script:
<paste>
Chatbase help page URL: <paste>
Avatar video URL: <paste or none>
```

## Before you finish

- SimWard Assistant is unchanged and still live.
- Simrule Regulatory Assistant passes at least 13 of 15 test questions, including all five adversarial ones (6, 7, 8, 12, 14).
- Widget Visibility is ON and the allowed domain is `jevwithwind.github.io`.
