"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  languages,
  steps,
  requestExample,
  responses,
} from "@/lib/marketing/content";
import styles from "./marketing.module.css";

export function CodePlayground() {
  const [language, setLanguage] = useState("cURL");
  const [step, setStep] = useState("0");
  const [message, setMessage] = useState("");
  const code = requestExample(language, Number(step));
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Copied");
    } catch {
      setMessage("Copy unavailable. Select and copy the code below.");
    }
  }
  function change(setter, value) {
    setter(value);
    setMessage("");
  }
  return (
    <Tabs
      value={language}
      onValueChange={(value) => change(setLanguage, value)}
      className={styles.codeWorkspace}
    >
      <div className={styles.codeToolbar}>
        <span>
          <Terminal size={15} /> HTTP API
        </span>
        <TabsList aria-label="Code language">
          {languages.map((item) => (
            <TabsTrigger value={item} key={item}>
              {item}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={language}>
        <Tabs value={step} onValueChange={(value) => change(setStep, value)}>
          <div className={styles.codeSteps}>
            <TabsList variant="line" aria-label="API step">
              {steps.map((item, index) => (
                <TabsTrigger key={item} value={String(index)}>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabsContent value={step}>
            <div className={styles.codePanes}>
              <div>
                <div className={styles.codeLabel}>
                  <span>REQUEST</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copy}
                    aria-label="Copy request code"
                  >
                    {message === "Copied" ? <Check /> : <Copy />}
                    {message === "Copied" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre
                  tabIndex={0}
                  aria-label={`${language} ${steps[Number(step)]} request`}
                >
                  <code>{code}</code>
                </pre>
              </div>
              <div>
                <div className={styles.codeLabel}>
                  <span>EXAMPLE RESPONSE · EXCERPT</span>
                  <span className={styles.responseStatus}>
                    {step === "0" ? "202 Accepted" : "200 OK"}
                  </span>
                </div>
                <pre tabIndex={0} aria-label="Example response">
                  <code>
                    {JSON.stringify(responses[Number(step)], null, 2)}
                  </code>
                </pre>
              </div>
            </div>
            <div className={styles.codeFoot}>
              <span>
                Set PLUKO_URL to your service origin. Replace JOB_ID with the
                returned ID.
              </span>
              <span role="status">{message}</span>
            </div>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
