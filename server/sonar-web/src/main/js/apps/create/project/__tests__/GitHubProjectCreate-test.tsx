/*
 * SonarQube
 * Copyright (C) 2009-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { shallow } from 'enzyme';
import * as React from 'react';
import { waitAndUpdate } from 'sonar-ui-common/helpers/testUtils';
import {
  getGithubClientId,
  getGithubOrganizations,
  getGithubRepositories
} from '../../../../api/alm-integrations';
import { mockGitHubRepository } from '../../../../helpers/mocks/alm-integrations';
import { mockAlmSettingsInstance } from '../../../../helpers/mocks/alm-settings';
import GitHubProjectCreate from '../GitHubProjectCreate';

jest.mock('../../../../api/alm-integrations', () => ({
  getGithubClientId: jest.fn().mockResolvedValue({ clientId: 'client-id-124' }),
  getGithubOrganizations: jest.fn().mockResolvedValue({ organizations: [] }),
  getGithubRepositories: jest.fn().mockResolvedValue({ repositories: [], paging: {} })
}));

const originalLocation = window.location;

beforeAll(() => {
  const location = {
    ...window.location,
    replace: jest.fn()
  };
  Object.defineProperty(window, 'location', {
    writable: true,
    value: location
  });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('should handle no settings', async () => {
  const wrapper = shallowRender({ settings: undefined });
  await waitAndUpdate(wrapper);
  expect(wrapper.state().error).toBe(true);
});

it('should redirect when no code', async () => {
  const wrapper = shallowRender();
  await waitAndUpdate(wrapper);

  expect(getGithubClientId).toBeCalled();
  expect(window.location.replace).toBeCalled();
});

it('should fetch organizations when code', async () => {
  const organizations = [
    { key: '1', name: 'org1' },
    { key: '2', name: 'org2' }
  ];
  (getGithubOrganizations as jest.Mock).mockResolvedValueOnce({ organizations });
  const wrapper = shallowRender({ code: '123456' });
  await waitAndUpdate(wrapper);

  expect(getGithubOrganizations).toBeCalled();
  expect(wrapper.state().organizations).toBe(organizations);
});

it('should handle org selection', async () => {
  const organizations = [
    { key: '1', name: 'org1' },
    { key: '2', name: 'org2' }
  ];
  (getGithubOrganizations as jest.Mock).mockResolvedValueOnce({ organizations });
  const repositories = [mockGitHubRepository()];
  (getGithubRepositories as jest.Mock).mockResolvedValueOnce({
    repositories,
    paging: { total: 1, pageIndex: 1 }
  });
  const wrapper = shallowRender({ code: '123456' });
  await waitAndUpdate(wrapper);

  wrapper.instance().handleSelectOrganization('1');
  await waitAndUpdate(wrapper);

  expect(wrapper.state().selectedOrganization).toBe(organizations[0]);
  expect(getGithubRepositories).toBeCalled();

  expect(wrapper.state().repositories).toBe(repositories);
});

it('should load more', async () => {
  const wrapper = shallowRender();

  const startRepos = [mockGitHubRepository({ key: 'first' })];
  const repositories = [
    mockGitHubRepository({ key: 'r1' }),
    mockGitHubRepository({ key: 'r2' }),
    mockGitHubRepository({ key: 'r3' })
  ];
  (getGithubRepositories as jest.Mock).mockResolvedValueOnce({ repositories });

  wrapper.setState({
    repositories: startRepos,
    selectedOrganization: { key: 'o1', name: 'org' }
  });

  wrapper.instance().handleLoadMore();

  await waitAndUpdate(wrapper);

  expect(getGithubRepositories).toBeCalled();
  expect(wrapper.state().repositories).toEqual([...startRepos, ...repositories]);
});

it('should handle search', async () => {
  const wrapper = shallowRender();
  const query = 'query';
  const startRepos = [mockGitHubRepository({ key: 'first' })];
  const repositories = [
    mockGitHubRepository({ key: 'r1' }),
    mockGitHubRepository({ key: 'r2' }),
    mockGitHubRepository({ key: 'r3' })
  ];
  (getGithubRepositories as jest.Mock).mockResolvedValueOnce({ repositories });

  wrapper.setState({
    repositories: startRepos,
    selectedOrganization: { key: 'o1', name: 'org' }
  });

  wrapper.instance().handleSearch(query);

  await waitAndUpdate(wrapper);

  expect(getGithubRepositories).toBeCalledWith('a', 'o1', 1, query);
  expect(wrapper.state().repositories).toEqual(repositories);
});

it('should handle repository selection', async () => {
  const repo = mockGitHubRepository();
  const wrapper = shallowRender();
  wrapper.setState({ repositories: [repo, mockGitHubRepository({ key: 'other' })] });

  wrapper.instance().handleSelectRepository(repo.key);
  await waitAndUpdate(wrapper);

  expect(wrapper.state().selectedRepository).toBe(repo);
});

function shallowRender(props: Partial<GitHubProjectCreate['props']> = {}) {
  return shallow<GitHubProjectCreate>(
    <GitHubProjectCreate
      canAdmin={false}
      settings={mockAlmSettingsInstance({ key: 'a' })}
      {...props}
    />
  );
}