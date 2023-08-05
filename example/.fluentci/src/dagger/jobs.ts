import Client from "@dagger.io/dagger";
import { withDevbox } from "https://deno.land/x/nix_installer_pipeline@v0.3.6/src/dagger/steps.ts";

export enum Job {
  rubocop = "rubocop",
  rails = "rails",
  rspec = "rspec",
  herokuDeploy = "heroku_deploy",
}

export const rubocop = async (client: Client, src = ".") => {
  const context = client.host().directory(src);
  const baseCtr = withDevbox(
    client
      .pipeline(Job.rubocop)
      .container()
      .from("alpine:latest")
      .withExec(["apk", "update"])
      .withExec(["apk", "add", "bash", "curl"])
      .withMountedCache("/nix", client.cacheVolume("nix"))
      .withMountedCache("/etc/nix", client.cacheVolume("nix-etc"))
  );

  const ctr = baseCtr
    .withMountedCache("/app/vendor", client.cacheVolume("bundle-cache"))
    .withDirectory("/app", context, {
      exclude: ["vendor", ".git", ".devbox", ".fluentci"],
    })
    .withWorkdir("/app")
    .withExec([
      "sh",
      "-c",
      "eval $(devbox shell --print-env) && ruby -v && \
       bundle config set --local deployment true && \
       bundle install -j $(nproc) && \
       bundle exec rubocop",
    ]);

  const result = await ctr.stdout();

  console.log(result);
};

export const rails = async (client: Client, src = ".") => {
  const context = client.host().directory(src);
  const baseCtr = withDevbox(
    client
      .pipeline(Job.rails)
      .container()
      .from("alpine:latest")
      .withExec(["apk", "update"])
      .withExec(["apk", "add", "bash", "curl"])
      .withMountedCache("/nix", client.cacheVolume("nix"))
      .withMountedCache("/etc/nix", client.cacheVolume("nix-etc"))
  );

  const ctr = baseCtr
    .withMountedCache("/app/vendor", client.cacheVolume("bundle-cache"))
    .withDirectory("/app", context, {
      exclude: ["vendor", ".git", ".devbox", ".fluentci"],
    })
    .withWorkdir("/app")
    .withExec([
      "sh",
      "-c",
      "eval $(devbox shell --print-env) && ruby -v && \
       bundle config set --local deployment true && \
       bundle install -j $(nproc) && \
       bundle exec rails db:migrate && \
       bundle exec rails db:seed && \
       bundle exec rails test",
    ]);

  const result = await ctr.stdout();

  console.log(result);
};

export const rspec = async (client: Client, src = ".") => {
  const context = client.host().directory(src);
  const baseCtr = withDevbox(
    client
      .pipeline(Job.rspec)
      .container()
      .from("alpine:latest")
      .withExec(["apk", "update"])
      .withExec(["apk", "add", "bash", "curl"])
      .withMountedCache("/nix", client.cacheVolume("nix"))
      .withMountedCache("/etc/nix", client.cacheVolume("nix-etc"))
  );

  const ctr = baseCtr
    .withMountedCache("/app/vendor", client.cacheVolume("bundle-cache"))
    .withDirectory("/app", context, {
      exclude: ["vendor", ".git", ".devbox", ".fluentci"],
    })
    .withWorkdir("/app")
    .withExec([
      "sh",
      "-c",
      "eval $(devbox shell --print-env) && ruby -v && \
       bundle config set --local deployment true && \
       gem install rspec && \
       bundle install -j $(nproc) && \
       rspec spec",
    ]);

  const result = await ctr.stdout();

  console.log(result);
};

export const herokuDeploy = async (client: Client, src = ".") => {
  const HEROKU_APP_NAME = Deno.env.get("HEROKU_APP_NAME");
  const HEROKU_PRODUCTION_KEY = Deno.env.get("HEROKU_PRODUCTION_KEY");

  if (!HEROKU_APP_NAME || !HEROKU_PRODUCTION_KEY) {
    throw new Error("HEROKU_APP_NAME or HEROKU_PRODUCTION_KEY not found");
  }

  const context = client.host().directory(src);
  const baseCtr = withDevbox(
    client
      .pipeline(Job.herokuDeploy)
      .container()
      .from("alpine:latest")
      .withExec(["apk", "update"])
      .withExec(["apk", "add", "bash", "curl"])
      .withMountedCache("/nix", client.cacheVolume("nix"))
      .withMountedCache("/etc/nix", client.cacheVolume("nix-etc"))
  );

  const ctr = baseCtr
    .withMountedCache("/app/vendor", client.cacheVolume("bundle-cache"))
    .withDirectory("/app", context, {
      exclude: ["vendor", ".git", ".devbox", ".fluentci"],
    })
    .withWorkdir("/app")
    .withExec([
      "sh",
      "-c",
      `eval $(devbox shell --print-env) && ruby -v && \
       bundle config set --local deployment true && \
       bundle install -j $(nproc) && \
       gem install dpl && \
       dpl --provider=heroku --app=${HEROKU_APP_NAME} --api-key=${HEROKU_PRODUCTION_KEY}`,
    ]);

  const result = await ctr.stdout();

  console.log(result);
};

export type JobExec = (client: Client, src?: string) => Promise<void>;

export const runnableJobs: Record<Job, JobExec> = {
  [Job.rubocop]: rubocop,
  [Job.rails]: rails,
  [Job.rspec]: rspec,
  [Job.herokuDeploy]: herokuDeploy,
};

export const jobDescriptions: Record<Job, string> = {
  [Job.rubocop]: "Run rubocop",
  [Job.rails]: "Run rails tests",
  [Job.rspec]: "Run rspec tests",
  [Job.herokuDeploy]: "Deploy to heroku",
};
