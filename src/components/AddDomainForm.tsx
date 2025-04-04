/*
 * This file is part of Cockpit-acme.
 *
 * Copyright (C) 2025 Tobias Vale
 *
 * Cockpit-acme is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit-acme is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useState } from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  CodeBlockCode,
  CodeBlock
} from '@patternfly/react-core';
import cockpit from 'cockpit';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { devMode } from '../app';

interface FormProps {
  updateRows: () => void;
}

export const AddDomainForm: React.FunctionComponent<FormProps> = ({ updateRows }) => {
  const [mainDomain, setMainDomain] = useState('');
  const [sanDomains, setSanDomains] = useState('');
  const [validInput, setValidInput] = useState(true);
  const [output, setOutput] = useState('');
  const sudoAcme = ["sudo", "-u", "acme"];
  const envVariables = ["DEPLOY_HAPROXY_HOT_UPDATE=yes", "DEPLOY_HAPROXY_STATS_SOCKET=/var/lib/haproxy/stats", "DEPLOY_HAPROXY_PEM_PATH=/etc/haproxy/certs"];

  function handleMainDomainChange(_event: React.FormEvent<HTMLInputElement>, mainDomain: string) {
    setMainDomain(mainDomain);
    setValidInput(true);
  };

  function handleSanDomainsChange(_event: React.FormEvent<HTMLInputElement>, sanDomains: string) {
    setSanDomains(sanDomains);
  };

  function getDomainList() {
      let result = ["-d", mainDomain];
      const sanDomainList = sanDomains.split(",");
      for (let domain of sanDomainList) {
        if (!domain) continue;
        result.push("-d", domain.trim());
      }
      return result;
    };

  function addCertificate() {
    if (!mainDomain) {
      console.error("Main Domain Missing!");
      setValidInput(false);
      return;
    }
    const domains = getDomainList();
    const firstCommand = sudoAcme.concat("/usr/local/bin/acme.sh", "--issue", domains, "--force", "--stateless", "--server", "letsencrypt");
    const secondCommand = sudoAcme.concat("env", envVariables, "sh", "/usr/local/bin/acme.sh", "--deploy", domains, "--deploy-hook", "haproxy");
    if (devMode) {
      setOutput(`${firstCommand.reduce((prev, curr) => prev + " " + curr)}\n`);
      setOutput(output => output + "Output of first command" + "\n");
      setOutput(output => output + secondCommand.reduce((prev, curr) => prev + " " + curr) + "\n");
      setOutput(output => output + "Output of second command\n");
      clearInput();
      updateRows();
      return;
    }
    setOutput(firstCommand.reduce((prev, curr) => prev + " " + curr) + '\n');
    cockpit.spawn(firstCommand, {superuser: "require"})
      .stream((commandOutput) => setOutput(output => output + commandOutput))
      .then(() => setOutput(output => output + secondCommand.reduce((prev, curr) => prev + " " + curr) + '\n'))
      .then(() => cockpit.spawn(secondCommand, {superuser: "require"})
      .stream((commandOutput) => setOutput(output => output + commandOutput)))
      .then(clearInput)
      .then(updateRows)
      .catch(error => setOutput(output => output + error.message));
  }

  function clearInput() {
    setMainDomain("");
    setSanDomains("");
  }
  
  function clearEverything() {
    clearInput();
    setOutput('');
  }

  return (
    <Form>
      <FormGroup
        label="Main Domain"
        fieldId="simple-form-mainDomain-01"
      >
        <TextInput
          type="url"
          id="simple-form-mainDomain-01"
          name="simple-form-mainDomain-01"
          value={mainDomain}
          onChange={handleMainDomainChange}
        />
        <FormHelperText>
          <HelperText>
            {validInput || <HelperTextItem icon={<ExclamationCircleIcon/>} variant='error'>This field is required</HelperTextItem>}
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup
        label="SAN-Domains"
        fieldId="simple-form-sanDomains-01"
      >
        <TextInput
          type="url"
          id="simple-form-sanDomains-01"
          name="simple-form-sanDomains-01"
          value={sanDomains}
          onChange={handleSanDomainsChange}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>Input an (optional) list of comma-separated SAN-Domains</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <ActionGroup>
        <Button variant="primary" onClick={addCertificate}>Add</Button>
        <Button variant="link" onClick={clearEverything}>Cancel</Button>
      </ActionGroup>
      <CodeBlock>
        <CodeBlockCode>{output}</CodeBlockCode>
      </CodeBlock>
    </Form>
  );
};
