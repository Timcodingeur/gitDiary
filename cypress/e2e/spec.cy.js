import 'cypress-downloadfile/lib/downloadFileCommand'

describe('Login test', () => {
  beforeEach(() => {
    cy.fixture('github_user').then((user) => {  
      cy.visit('http://localhost:8000')
      cy.origin("https://github.com", { args: { user } }, ({ user }) => {
        cy.get('input[id="login_field"]').type(user.username)
        cy.get('input[id="password"]').type(user.password)
        cy.get('input[name="commit"]').click()
        cy.wait(2000)
      })
    })
  })
  it('Should create commit table and can export the table with different extension', () => {
    cy.get('button[id="create-table-commit"]').click()

    cy.get('div[class="container"]').should('be.visible')

    cy.get('h2').invoke('text').should('eq', 'Friday, January 17, 2025');

    cy.get('th[id="hash"]').invoke('text').should('eq', 'Hash');
    cy.get('th[id="author"]').invoke('text').should('eq', 'Author');
    cy.get('th[id="date"]').invoke('text').should('eq', 'Date');
    cy.get('th[id="message"]').invoke('text').should('eq', 'Message');
    cy.get('th[id="duration"]').invoke('text').should('eq', 'Duration');

    cy.get('tr[id="commit-content"]').children().its('length').should('eq', 5);
    cy.get('tr[id="commit-content"] td[id="commit-hash"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="commit-content"] td[id="commit-author"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="commit-content"] td[id="commit-date"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="commit-content"] td[id="commit-message"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="commit-content"] td[id="commit-duration"]').invoke('text').should('not.eq', '');

    cy.get('tr[id="day-total-time"]').children().its('length').should('eq', 5);
    cy.get('tr[id=""day-total-time"] td[id="day-total"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="day-total-time"] td[id="day-total-duration"]').invoke('text').should('not.eq', '');

    const downloadsFolder = Cypress.config('downloadsFolder')

    cy.get('button[id="export-pdf"]').click()
    cy.readFile(`${downloadsFolder}/commits.pdf`).should('exist')

    cy.get('button[id="export-csv"]').click()
    cy.readFile(`${downloadsFolder}/commits.csv`).should('exist')

    cy.get('button[id="export-md"]').click()
    cy.readFile(`${downloadsFolder}/commits.md`).should('exist')
  })
  it('Should create issues table and can export it with diferent extension', () => {
    cy.get('button[id="create-table-issues"]').click()

    cy.get('div[class="container"]').should('be.visible')

    cy.get('th[id="number"]').invoke('text').should('eq', 'Issue Number');
    cy.get('th[id="title"]').invoke('text').should('eq', 'Title');
    cy.get('th[id="author"]').invoke('text').should('eq', 'Author');
    cy.get('th[id="state"]').invoke('text').should('eq', 'State');
    cy.get('th[id="start-date"]').invoke('text').should('eq', 'Start Date');
    cy.get('th[id="end-date"]').invoke('text').should('eq', 'End Date');
    cy.get('th[id="duration"]').invoke('text').should('eq', 'Duration');

    cy.get('tr[id="issue-content"]').children().its('length').should('eq', 7);
    cy.get('tr[id="issue-content"] td[id="issue-number"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-title"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-author"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-state"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-start-date"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-end-date"]').invoke('text').should('not.eq', '');
    cy.get('tr[id="issue-content"] td[id="issue-duration"]').invoke('text').should('not.eq', '');

    const downloadsFolder = Cypress.config('downloadsFolder')

    cy.get('button[id="export-pdf"]').click()
    cy.readFile(`${downloadsFolder}/issues.pdf`).should('exist')

    cy.get('button[id="export-csv"]').click()
    cy.readFile(`${downloadsFolder}/issues.csv`).should('exist')

    cy.get('button[id="export-md"]').click()
    cy.readFile(`${downloadsFolder}/issues.md`).should('exist')
  })
})
