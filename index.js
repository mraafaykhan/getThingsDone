#!/usr/bin/env node

import axios from 'axios';
import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables from .env file
dotenv.config();

const NUM_TODOS = parseInt(process.env.NUM_TODOS, 10) || 20;
const NUM_RETRIES = parseInt(process.env.NUM_RETRIES, 10) || 3;

const program = new Command();

program
  .version('1.0.0')
  .description('Fetch TODOs from jsonplaceholder')
  .option('-n, --num <number>', 'Number of TODOs to fetch', parseInt)
  .option('-r, --retries <number>', 'Number of retries for failed requests', parseInt)
  .parse(process.argv);

const options = program.opts();
const numTodos = options.num || NUM_TODOS;
const numRetries = options.retries || NUM_RETRIES;

const fetchTodo = async (id, retries) => {
  try {
    const response = await axios.get(`https://jsonplaceholder.typicode.com/todos/${id}`);
    return response.data;
  } catch (error) {
    if (retries > 0) {
      console.log(chalk.yellow(`Retrying TODO ${id} (${NUM_RETRIES - retries + 1})...`));
      return fetchTodo(id, retries - 1);
    } else {
      console.log(chalk.red(`Failed to fetch TODO ${id} after ${NUM_RETRIES} retries.`));
      return null;
    }
  }
};

const fetchTodos = async (numTodos, retries) => {
  const todoPromises = [];
  for (let i = 2; i <= numTodos * 2; i += 2) {
    todoPromises.push(fetchTodo(i, retries));
  }

  return todoPromises;
};

const main = async () => {
  console.log(chalk.blue(`Fetching ${numTodos} TODOs with up to ${numRetries} retries each...`));

  const table = new Table({
    head: [chalk.cyan('Index/ID'), chalk.cyan('Completion Status'), chalk.cyan('Title')],
    colWidths: [10, 20, 50],
  });

  const spinner = ora('Fetching TODOs...').start();
  const startTime = performance.now(); // Start time measurement
  const todoPromises = await fetchTodos(numTodos, numRetries);

  let fetchedTodos = 0;
  let successfulFetches = 0;
  let failedFetches = 0;
  let completedTodos = 0;
  let incompleteTodos = 0;

  const processTodo = async (promise) => {
    const todo = await promise;
    fetchedTodos++;
    if (todo) {
      successfulFetches++;
      if (todo.completed) {
        completedTodos++;
      } else {
        incompleteTodos++;
      }
      table.push([todo.id, todo.completed ? chalk.green('Completed') : chalk.red('Not Completed'), todo.title]);
      console.clear();
      console.log(table.toString());
    } else {
      failedFetches++;
    }

    if (fetchedTodos === numTodos) {
      spinner.stop();
      const endTime = performance.now(); // End time measurement
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // Time taken in seconds

      console.log(chalk.green('All TODOs fetched.'));
      console.log(chalk.yellow('\nSummary:'));
      console.log(`  ${chalk.green('Success:')} ${successfulFetches}`);
      console.log(`  ${chalk.red('Failed:')} ${failedFetches}`);
      console.log(`  ${chalk.blue('Total fetched:')} ${fetchedTodos}`);
      console.log(`  ${chalk.green('Completed:')} ${completedTodos}`);
      console.log(`  ${chalk.red('Incomplete:')} ${incompleteTodos}`);
      console.log(`  ${chalk.magenta('Time taken:')} ${timeTaken} seconds`);
    }
  };

  todoPromises.forEach(promise => processTodo(promise));

  spinner.start(); // Restart spinner if it stops prematurely
};

main();
